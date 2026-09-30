"""Keyword crisis detection — the deterministic safety net in front of the LLM.

Rewritten for is_crisis(); the old check_guardrail_keywords() API was replaced when
guardrail.py moved to normalized phrase matching.
"""
import os
import sys
import types
import unittest

os.environ.setdefault("JWT_SECRET", "isolated-guardrail-test-key-not-for-real-sessions")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# guardrail.py reads hotlines on import in some paths; no database in unit tests.
fake_db = sys.modules.get("core.db") or types.ModuleType("core.db")
fake_db.query = lambda *args, **kwargs: []
sys.modules["core.db"] = fake_db

from services.chatbot.guardrail import is_crisis  # noqa: E402


class CrisisDetectionTests(unittest.TestCase):
    def test_detects_explicit_crisis(self):
        for text in [
            "saya mau bunuh diri",
            "saya ingin bunuh diri",
            "cara bunuh diri",
            "saya tidak mau hidup lagi",
            "ingin mati",
            "mau mati",
            "menyakiti diri sendiri",
            "self harm",
            "overdosis",
        ]:
            with self.subTest(text=text):
                self.assertTrue(is_crisis(text))

    def test_ignores_case_and_punctuation(self):
        for text in ["SAYA MAU BUNUH DIRI", "Saya Mau Bunuh Diri!!!", "sAyA mAu BuNuH dIrI"]:
            with self.subTest(text=text):
                self.assertTrue(is_crisis(text))

    def test_does_not_fire_on_everyday_phrases(self):
        # A false positive shows the crisis sheet over an ordinary chat, so these matter
        for text in ["mati lampu", "hp mati", "baterai mati", "matiin lampu",
                     "aku capek banget", "lagi sedih hari ini", ""]:
            with self.subTest(text=text):
                self.assertFalse(is_crisis(text))


if __name__ == "__main__":
    unittest.main()
