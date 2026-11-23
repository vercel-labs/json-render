# Compact positional format pilot

The catalog-derived positional format reduces average generated output from 2,130.5 to 960.6 tokens (54.9%) against the current strict Compact implementation. The 1–2% lead over OpenUI was **not reached**: OpenUI averages 823.2 tokens, making this candidate 16.7% larger. The candidate is retained for its improvement over current Compact, with no component, model, or benchmark-specific product rules.

## Live generation

| Gateway model | Previous Compact mean tokens | Positional mean tokens | OpenUI mean tokens | Compact structural success | OpenUI structural success |
| --- | ---: | ---: | ---: | --- | --- |
| `deepseek/deepseek-v4.1-flash-1017-fast` | 2,304.0 | 1,541.5 | 1,040.7 | 5/6 → 6/6 | 6/6 |
| `openai/gpt-6-luna-fast` | 1,799.3 | 595.8 | 819.8 | 4/6 → 4/6 | 2/6 |
| `openai/gpt-6.1-terra` | 2,288.2 | 744.3 | 609.0 | 6/6 → 6/6 | 6/6 |
| Pooled | 2,130.5 | 960.6 | 823.2 | 15/18 → 16/18 | 14/18 |

No case that passed before failed in the corrected pilot. Both remaining Compact failures are Luna's `b4-saas` and `b5-exec`, with required `Form.buttons` absent. These are unchanged failing cases, not repaired outputs. “Structural success” is the upstream validator's result; it does not establish visual quality or coverage of every requested feature. The parser recognized a root in 18/18 Compact responses and 16/18 OpenUI responses; that is not a browser-render test.

Mean nonstreaming request duration was 19.49 seconds before, 8.90 seconds for the candidate, and 6.04 seconds for OpenUI. These are single runs at different times and request order, not controlled latency estimates. Network TTFT and browser paint were not measured.

## Identical-content checks

All 18 saved Compact responses round-trip through the real built candidate and compiler with unchanged state, props, metadata, child order, and presence flags. Only omitted empty child/declared-slot containers are normalized. They use 12,945 tokens instead of 38,349 (66.2% fewer), including three responses that remain structurally incomplete under the upstream validator.

The 14 valid, representable saved OpenUI responses use 8,494 positional tokens versus 10,304 raw OpenUI tokens (17.6% fewer). Invalid or unmappable OpenUI responses are excluded from this lossless comparison, but not from live averages. Minified inline OpenUI for the same content uses 6,645 tokens, so this is not evidence that positional JSON is intrinsically smaller than OpenUI's language.

The prototype forecast was 10,108 tokens across 15 complete Compact outputs; the actual codec uses 10,068. The 40-token difference comes from general nested optional encoding, with canonical content preserved. The corresponding OpenUI count remains exactly 8,494. The observed lossless savings support the forecast; live generation is a different workload and did not achieve the OpenUI target.

Five interleaved 32-character-chunk replays per saved response, after warmup, reduce the mean of per-case median decoder time from 20.47 to 5.15 ms. The first published root moves from a mean prefix of 72.83 to 37.89 tokens. Every root published before the document ended. These are local decoding measurements, not network or rendering latency.

## Input cost and generality

The candidate system prompt uses 2,753 tokens and its response schema 17,518, totaling 20,271 before the user prompt. Previous Compact used 3,906 + 28,113 = 32,019. OpenUI uses a 5,017-token system prompt without a response schema. Smaller output does not erase Compact's larger conditioning input.

The codec derives node layouts and required-first prop order from the caller's catalog. It retains arbitrary records, explicit null versus absence, expressions, state, actions, slots, refinements, and streaming. JSONL and YAML transports are unchanged. No named component, model, benchmark prompt, or fixture appears in product dispatch logic. Providers must support the exported JSON Schema tuple and recursive-union features; unsupported catalogs still fail explicitly. This pilot does not prove universal provider or Zod-type support.

## Method and verification

Measured October 27, 2026 against `thesysdev/generative-ui-bench` commit `fcca05af68dc3acc5b04660531509b4aed861c7e`, using its public 70-component catalog, two equivalent examples, scorer, and six briefs: `b1-uptime`, `b2-sales`, `b2-job`, `b3-server`, `b4-saas`, `b5-exec`. Original json-render baseline: `1976a780b03a6a7e35f42c4e42edfa152d91bd76`. Fixed candidate core bundle SHA256: `06125c01095bc4cdc0ca6c2bab3ab78d47fd703ffc51ca943a1a93cff9b4bcf5`.

Each model receives one attempt per brief, temperature 0.7, reasoning disabled, and an 8,192-token ceiling. Token counts use `o200k_base`, not each model's billing tokenizer. Original OpenUI responses are reused. Models are the Gateway IDs shown above; the requested Luna Flash and DeepSeek 10117 names were mapped to the available Luna Fast and DeepSeek 1017 Fast entries before the baseline.

The first positional run was rejected: Terra refused five invalid empty `prefixItems` arrays, and Luna produced one malformed response that hit the token ceiling. All 13 attempts and five skips remain recorded. The generic fix omits empty `prefixItems` while preserving zero tuple bounds. Independent AJV Draft2020-12 validation confirms both the full benchmark and playground schemas. No output repair, relaxed constraints, silent fallback, or retry was used. The corrected 18-request run starts with the previously rejecting provider to fail early if needed.

Verification passed: 86 focused tests, 12 renderer transport tests, 61 workspace typechecks, full-schema validation, MDX compilation, documentation fixture hashes, and formatting. The original and final built decoders were independently compared on identical saved outputs. Product review found no concrete correctness regressions. Full web production build and browser visual checks were not run.

There is no holdout or repeated generation confirmation. Selection and reporting share this small sample; a 1–2% general performance claim is not supported. DeepSeek's repeated unused trailing fields account for visible waste, but no model-specific rule was added. Further live improvements remain unmeasured.

The run stopped at two experiments and 71 of the 72-request cap: 36 baseline requests, four capability probes, 13 failed-candidate attempts, and 18 corrected-candidate attempts. Conservative API accounting totals $1.432779 against the $5 ceiling; agent/session compute cost is not measured. Outcomes: one rejected candidate, one retained candidate; no deferred dependency or unselected candidate. Code and report stay on `laf/optimize-compact-wire-tokens`; no push or PR update is included.

Raw plans, requests, responses, hashes, scorer revisions, budget, and replay evidence are preserved beside the worktree under `../ce-optimize/compact-wire-tokens/`. The tracked JSON result file accompanies this report. The original baseline and the unsuccessful run are retained rather than overwritten.
