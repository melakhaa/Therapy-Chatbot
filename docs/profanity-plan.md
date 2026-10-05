# Plan: ID/JV profanity handling (English is fine as-is)

Branch: `feat/guardrail-id`

## Evidence (probe: `apps/backend/scripts/profanity_probe.py`)

`llama3.2:3b` with the Hana persona, measured on 2026-10-05:

| Input | Verdict |
|---|---|
| English pure insult | OK — empathetic, no mirroring, no refusal |
| English mixed with real content | OK |
| Indonesian pure insult | MIRROR — repeats the curse, hallucinates meaning |
| Indonesian mixed ("stres, [curse], tugas numpuk") | MIRROR — embeds the word in the reply |
| Javanese pure insult | OK — "aku tidak paham maksudmu" (desired behavior) |
| Javanese mixed | MIRROR + misreads it as a trigger term |

Conclusion: **no filter for English** — the LLM handles it. Only Indonesian/Javanese
curses need handling, because the 3B model mirrors them back in a therapy context.

## Design (one function, no new deps)

In `guardrail.py`, next to the crisis net (reuse `_normalize`):

1. `PROFANITY` — Indonesian + Javanese curse tokens only (no English words in the
   codebase; keeps the agent harness quiet too). Case/leet/elongation variants are
   handled free by `_normalize` (`c0k`, `anjiiiing` fold to the canonical token).
2. `strip_profanity(text) -> str` — removes the tokens, collapses whitespace.
3. In `core.chat_stream`, **after** the crisis check (a profanity-laced crisis message
   must still get the hotline card):
   - stripped text is empty/meaningless → yield fixed reply:
     `Maaf, aku tidak paham maksudmu. Kamu ingin bercerita tentang sesuatu?`
     (the Javanese-probe behavior, promoted to the general case)
   - otherwise → continue to the LLM with the **stripped** message (kills mirroring,
     keeps the real content and the support flow).

No new route, no LLM judge, no response-side scan.

## Tests

`tests/test_guardrail.py` additions:

- `strip_profanity` removes ID/JV tokens including leet/elongation variants
- pure profanity → fixed reply path; mixed → stripped content preserved
- crisis + profanity → still `HARDCODED_RESPONSE` (crisis wins)
- false-positive guard: everyday words that merely contain a token stay intact
  (whole-token matching only — `asin`, `makanan` etc. never hit)

Validation: `venv/bin/python -m unittest discover -s tests -v`, then rerun
`scripts/profanity_probe.py` end-to-end through `core.chat` — all six probes should
come back `OK` (no `MIRROR`, no `REFUSE`).

## Out of scope

- English profanity (LLM handles it — measured).
- Tone policing beyond stripping; words the LLM should just absorb in mixed messages
  stay as content.
- Semantic-router changes (profanity is not an intent).
