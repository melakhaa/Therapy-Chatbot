# Plan — Deploy `SekarBestNY/llama-3-8b-instruct-gguf` as an HF Inference Endpoint

Runbook for standing up the model as a managed Hugging Face **Inference Endpoint** in the
`melakha` namespace using the `hf` CLI, then verifying it answers. Written against
`hf` CLI **v2.1.1** (`hf endpoints deploy`, managed engine `llamacpp`).

## Goal

One GPU Inference Endpoint serving `SekarBestNY/llama-3-8b-instruct-gguf`, reachable over
HTTPS, verified with a live completion call. Nothing else.

## What we're deploying

| Fact | Value |
|------|-------|
| Repo | `SekarBestNY/llama-3-8b-instruct-gguf` (public, not gated) |
| Format | GGUF — single file `local_model.Q4_K_M.gguf` (~4.9 GB) |
| Arch | `llama`, native context 131072 (128k) |
| Engine | `llamacpp` (the managed engine for GGUF; repo is tagged `endpoints_compatible`) |
| Namespace | `melakha` |

Single GGUF in the repo → the llama.cpp engine auto-detects it; no `gguf_file` selection needed.

## ⚠ Hard prerequisite — fix auth first

The token currently on this machine **cannot touch the Endpoints API**:

```
$ hf endpoints hardware --namespace melakha
403 Forbidden ... missing permissions: inference.endpoints.read
```

(Public model/catalog reads work; endpoints calls do not.) This blocks every step below, so it
is step 0.

1. Create a token at <https://huggingface.co/settings/tokens> that:
   - belongs to (or has write access to) the **`melakha`** namespace/org, and
   - has the **Inference Endpoints** scope (`inference.endpoints.read` + `.write`).
2. Log it in:
   ```bash
   hf auth login --token <NEW_TOKEN>      # or export HF_TOKEN=<NEW_TOKEN>
   hf auth whoami                          # confirm identity + namespace
   ```
3. Confirm the gate is open before spending anything:
   ```bash
   hf endpoints hardware --namespace melakha --accelerator gpu
   ```

## Step 1 — Pick hardware

For a Q4_K_M 8B (~4.9 GB weights):

- Weights ≈ 4.9 GB + KV cache (~128 KB/token → ~1 GB @ 8k ctx) + compute buffers ≈ **~7 GB**;
  24 GB leaves comfortable headroom up to ~32k context.
- **CPU-only is out** — this is an interactive therapy chatbot; CPU inference latency is unacceptable.

**Pick: 1× NVIDIA L4 (24 GB), single replica** — the cheapest GPU that fits with room to spare.
Read the exact field values off the catalog (they are region/quota-specific; don't hardcode):

```bash
hf endpoints hardware --namespace melakha --accelerator gpu
```

Take the row whose instance type is `nvidia-l4` and note its **`--vendor` / `--region` /
`--instance-type` / `--instance-size`** (e.g. `x1`) values. Fallbacks if L4 is unavailable in
quota/region: **A10G (24 GB)**, then **A100 40 GB** only if throughput demands it.

## Step 2 — Deploy

```bash
hf endpoints deploy sajiwa-llama3-8b-gguf \
  --repo SekarBestNY/llama-3-8b-instruct-gguf \
  --namespace melakha \
  --framework custom --engine llamacpp \
  --accelerator gpu \
  --instance-type  nvidia-l4 \
  --instance-size  x1 \
  --vendor         aws \
  --region         us-east-1 \
  --task           text-generation \
  --min-replica 1 --max-replica 1 \
  --type authenticated
```

- `--instance-type/--instance-size/--vendor/--region` = the values from Step 1 (the strings above
  are placeholders).
- **One flag to confirm at deploy time:** the GGUF engine is `--engine llamacpp` (matches the
  catalog's GGUF entries). If the API rejects `--framework custom --engine llamacpp`, the
  container form is `--framework custom --engine llamacpp --custom-image <llama.cpp image>
  --port 8080 --health-route /health`. Run `hf endpoints deploy --help` / HF Inference Endpoints
  docs to pin the exact pairing before retrying.
- `--type authenticated` (default) = token-gated HTTPS. Use `--type public` only if the app must
  call it without a token (see Out of scope).
- GPU endpoints **bill per hour while running** (see Cost safety).

## Step 3 — Wait for it to come up

```bash
watch -n 15 'hf endpoints describe sajiwa-llama3-8b-gguf --namespace melakha --json'
```

Poll until status is `deployed` (HF's "running" state). Note the returned **`url`** — that's the
base URL for Step 4. If status goes to `failed`, read the build/runtime logs in the describe
output before changing anything.

## Step 4 — Verify it responds

```bash
URL=$(hf endpoints describe sajiwa-llama3-8b-gguf --namespace melakha --json | jq -r .url)
TOKEN=$(hf auth token)

# health
curl -sS "$URL/health"

# a real completion (llamacpp exposes the OpenAI-compatible route)
curl -sS "$URL/v1/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Reply with one word: hello"}],"max_tokens":16}'
```

Pass = HTTP 200 and a `choices[0].message.content` that isn't empty. If `/v1/chat/completions`
404s, fall back to llama.cpp's native `POST $URL/completion` with `{"prompt":"...","n_predict":16}`.

## Cost safety

Idle GPUs burn money. When not actively using it:

```bash
hf endpoints scale-to-zero sajiwa-llama3-8b-gguf --namespace melakha   # or:
hf endpoints pause        sajiwa-llama3-8b-gguf --namespace melakha
```

(Optionally pass `--scale-to-zero-timeout <min>` at deploy time to automate this.)

## Out of scope (follow-up)

Wiring this endpoint into the app is **not** part of this task. Today the backend talks to Ollama
(`services/chatbot/llm.py` = `ChatOllama`, `rag.py` = `OllamaEmbeddings`, `core.py` =
`OllamaEncoder`). Pointing generation at the new endpoint is a separate change on this branch once
the endpoint is confirmed healthy.
