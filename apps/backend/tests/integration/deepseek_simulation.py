"""FastAPI chat routes against a loopback stand-in for DeepSeek Chat Completions.

Provider behavior is based on api-docs.deepseek.com/api/create-chat-completion and
/guides/safety. Runs with synthetic inputs, a fake key, and stubbed DB/embeddings.
"""
import json
import os
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from threading import Thread
import time
import types
import unittest
from unittest.mock import patch

from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
ANSWER = "Aku mendengarkan."
USER = "11111111-1111-4111-8111-111111111111"


def completion(content, reason="stop"):
    return json.dumps({"choices": [{"message": {"content": content}, "finish_reason": reason}]}).encode()


class DeepSeekStandIn(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers["content-length"])
        self.server.calls.append((self.path, self.headers.get("authorization"), json.loads(self.rfile.read(length))))
        status, body = self.server.reply
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        try:
            if body is None:
                # A waiting DeepSeek connection can send blank lines without a completion.
                for _ in range(60):
                    self.wfile.write(b"\n")
                    self.wfile.flush()
                    time.sleep(0.025)
            else:
                self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the caller enforced its deadline

    def log_message(self, *args):
        pass


class DeepSeekSimulation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.enterClassContext(patch.dict(os.environ, {
            "DEEPSEEK_ALLOW_CHAT_EGRESS": "1", "DEEPSEEK_API_KEY": "synthetic-key",
            "LITELLM_LOCAL_MODEL_COST_MAP": "True", "JWT_SECRET": "synthetic-signing-key-for-local-simulation",
            "ENCRYPTION_KEY": Fernet.generate_key().decode(),
        }))
        fake_db = types.ModuleType("core.db")

        def query(sql, *args, **kwargs):
            if sql.startswith("select role from users"):
                return [{"role": "mahasiswa"}]
            raise AssertionError("chat generation must not read transcript or other student records")

        @contextmanager
        def db(user_id):
            assert user_id == USER
            yield types.SimpleNamespace(execute=lambda sql, params: cls.writes.append((sql, params)))

        fake_db.query, fake_db.db = query, db
        cls.enterClassContext(patch.dict(sys.modules, {"core.db": fake_db}))
        from services.chatbot import conversational, guardrail, provenance, rag

        utterances = [route.utterances for route in (
            conversational.conversational_route, guardrail.guardrail_route,
            provenance.provenance_route, rag.rag_route,
        )]

        def embed(encoder, texts):
            return [[float(text in examples) for examples in utterances] for text in texts]

        cls.enterClassContext(patch("semantic_router.encoders.OllamaEncoder.__call__", embed))
        from auth import create_token
        from routes.chat import chat_router
        from services.chatbot import llm

        cls.llm = llm
        cls.crisis_reply = guardrail.HARDCODED_RESPONSE
        cls.provider = cls.enterClassContext(ThreadingHTTPServer(("127.0.0.1", 0), DeepSeekStandIn))
        thread = Thread(target=cls.provider.serve_forever, daemon=True)
        thread.start()
        cls.addClassCleanup(cls.provider.shutdown)
        url = f"http://127.0.0.1:{cls.provider.server_port}/chat/completions"
        cls.enterClassContext(patch.object(llm, "CHAT_COMPLETIONS_URL", url))
        app = FastAPI()
        app.include_router(chat_router)
        cls.client = cls.enterClassContext(TestClient(app, headers={
            "Authorization": f"Bearer {create_token(USER, 'fixture@example.com')}",
        }))

    def setUp(self):
        self.provider.calls = []
        self.provider.reply = 200, completion(ANSWER)
        self.writes.clear()

    writes = []

    def post(self, path, message="halo"):
        return self.client.post(path, json={"message": message, "session_id": "synthetic-session"})

    def test_completed_answer_reaches_both_routes_without_history(self):
        self.assertEqual(self.post("/chat").json(), {
            "response": ANSWER, "route": "conversational", "is_high_risk": False,
        })
        self.assertEqual(self.post("/chat/stream").text.splitlines()[::2], [
            'data: {"route": "conversational", "is_high_risk": false}',
            f'data: {{"token": "{ANSWER}"}}', "data: [DONE]",
        ])
        self.assertEqual(len(self.provider.calls), 2)
        for path, key, payload in self.provider.calls:
            self.assertEqual((path, key), ("/chat/completions", "Bearer synthetic-key"))
            self.assertEqual(payload["messages"][1:], [{"role": "user", "content": "halo"}])
            for local_only in (USER, "synthetic-session", "fixture@example.com"):
                self.assertNotIn(local_only, str(payload))

    def test_failures_never_return_or_save_an_assistant_answer(self):
        failure_cases = [(code, b"PROVIDER_CANARY") for code in (400, 401, 402, 429, 503)] + [
            (200, b'{"choices": [PROVIDER_CANARY'),  # malformed or truncated JSON
            (200, completion("PROVIDER_CANARY", "content_filter")),
            (200, completion("PROVIDER_CANARY", "length")),
            (200, completion("   ")),
        ]
        for reply in failure_cases:
            with self.subTest(reply=reply):
                self.provider.reply = reply
                self.provider.calls.clear()
                self.writes.clear()
                with self.assertLogs(level="ERROR") as logs:
                    stream = self.post("/chat/stream").text
                    joined = self.post("/chat")
                self.assertIn('data: {"error": "generation_failed"}', stream)
                self.assertNotIn("[DONE]", stream)
                self.assertNotIn('"token"', stream)
                self.assertEqual(joined.status_code, 503)
                self.assertEqual(joined.json(), {"detail": "Sajiwa sedang tidak bisa dihubungi."})
                self.assertNotIn("PROVIDER_CANARY", "".join(logs.output))
                self.assertEqual(len(self.provider.calls), 2, "one upstream request per turn, no retry")
                message_writes = [(sql, params) for sql, params in self.writes if "insert into messages" in sql]
                self.assertEqual(len(message_writes), 1, "only the streaming user message was saved")
                self.assertIn("'user'", message_writes[0][0])

    def test_keep_alive_does_not_extend_the_deadline(self):
        self.provider.reply = 200, None
        with patch.object(self.llm, "DEADLINE_SECONDS", 0.25), self.assertLogs(level="ERROR") as logs:
            reply = self.post("/chat/stream")
        self.assertIn('data: {"error": "generation_failed"}', reply.text)
        self.assertIn("reason=timeout", "".join(logs.output))
        self.assertEqual(len(self.provider.calls), 1)

    def test_crisis_remains_local_when_cloud_is_disabled(self):
        with patch.dict(os.environ, {"DEEPSEEK_ALLOW_CHAT_EGRESS": "0"}):
            message = "saya mau bunuh diri"
            frames = self.post("/chat/stream", message).text.splitlines()[::2]
        self.assertEqual(frames[0], 'data: {"route": "guardrail", "is_high_risk": true}')
        self.assertEqual(json.loads(frames[1][6:]), {"token": self.crisis_reply})
        self.assertEqual(frames[2], "data: [DONE]")
        self.assertEqual(self.provider.calls, [])
        logs = [params for sql, params in self.writes if "insert into guardrail_logs" in sql]
        self.assertEqual(len(logs), 1)
        self.assertTrue(logs[0][2].startswith("gAAAAA"))
        self.assertNotIn(message, logs[0][2])


if __name__ == "__main__":
    unittest.main(verbosity=2)
