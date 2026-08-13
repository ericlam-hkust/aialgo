# Base Model Library with fine-tuning

Add a Hugging Face-style pretrained base model ecosystem: contributors start from platform base models, fine-tune locally or in the cloud, and publish derivative models that still pass the normal backtest pipeline.

## 1. Rename

"Upload AI model" becomes "AI Model" everywhere it appears (sidebar nav label, My Work menu items, buttons). Route path stays `/dashboard/models/new`.

## 2. Base Model Library

New catalog section under Discover: `/marketplace/base-models`.

Seeded base models (mock, platform-provided):
- `momentum-lstm-base` — sequence model, US + HK equities, 1h/1d
- `meanrev-gbm-base` — gradient-boosted mean reversion, crypto majors, 15m/1h
- `rsi-grid-algo-base` — rule-based algo grid, forex + crypto, 1h/4h

Card: architecture summary, pretrained-on coverage (instruments, timeframe, data range), input schema summary, baseline reference performance labeled "Base performance — derivatives must pass their own backtest", fine-tune compute estimate, "Use this base" button, and the "Not directly subscribable" label.

Detail page `/marketplace/base-models/$id`: full docs, feature schema table derivatives must conform to, frozen vs trainable layer table, recommended fine-tune settings, three path cards (local / cloud / from scratch), and a derivatives tree listing published models fine-tuned from this base with their verified metrics and trust tier.

## 3. Three contributor paths

- **Download & fine-tune locally** — package contents list (weights/code stub, manifest template, sample data, training notebook), a download button producing the manifest template, and the SDK flow shown as copyable commands (`aialgo pull aialgo/meanrev-gbm-base`, fine-tune, `aialgo push --base ...`).
- **Cloud Fine-Tune** — no-code wizard at `/dashboard/models/fine-tune/$baseId`: pick instruments and timeframe → set fine-tune parameters (entry/exit thresholds, training window, epochs) → simulated sandbox training with animated progress and a live loss curve → automatic hand-off into the existing backtest validation → review the auto-generated report → publish (name, tagline, per-trade fee 5–25%). Free for contributors.
- **From scratch** — existing upload wizard, unchanged except derivative locking below.

## 4. Lineage

Derivative models store base id, base version, and fine-tune method (`local` / `cloud` / `params_only`) in their manifest/listing record. Model detail and cards show a lineage badge: "Fine-tuned from aialgo/meanrev-gbm-base v2.1 · View base →", or "Adapted from" for params_only; cloud fine-tunes also get a "Cloud-trained" marker. Marketplace filters gain a "Base model" filter.

## 5. Validation rules

When the upload wizard runs in derivative mode, the feature schema and output contract fields render read-only with an explanatory note. Every derivative — cloud fine-tunes included — goes through the existing mandatory backtest verification before it can be listed publicly; lineage grants no trust badge on its own. Cloud training completion enqueues a validation job automatically.

## 6. Fine-tuning Guide

New docs page `/marketplace/docs/fine-tuning`: how base models were trained (high level), frozen-vs-trainable contract, local SDK walkthrough, cloud walkthrough, recommended data windows, pitfalls (short-window overfitting, linked to the walk-forward consistency score), and a publish checklist. Linked from docs index and every base model page.

## 7. Multi-model pipeline bundles

Extend the upload system so one listing can package several cooperating models.

- **Package structure**: an `artifacts/` folder holding multiple model files, plus a `pipeline` block in the manifest: `type` (ensemble / sequential / regime_router / meta_labeling / custom), per-artifact `role` (e.g. regime detector, signal generator, meta filter), execution order, and an architecture description.
- **Resources block**: `memory_mb`, `max_inference_ms`, `requires_gpu`. Declared in the manifest and enforced as a gate at the start of backtest validation. Exceeding a limit fails the job with a specific error and remediation guidance (e.g. "Bundle requests 8192 MB; validation tier allows 4096 MB — prune artifacts, quantise weights, or merge the regime router into the signal model"), shown in the run report and the wizard.
- **Pipeline diagram**: the model detail page renders a visual flow of the internal models and their roles (stage boxes, arrows, per-artifact role and type), so consumers see what they are subscribing to.
- **Atomic versioning**: any artifact change bumps the bundle to a new version and invalidates prior verification — the new version must pass its own backtest before it can be listed. The wizard and version list state this explicitly.
- **Wizard path**: an "Advanced: Multi-Model Pipeline" option in the upload wizard with a pipeline builder preview (add artifacts, assign roles, choose pipeline type, live diagram preview) and the note: "Multi-stage pipelines carry higher overfitting risk — your model will receive extra walk-forward scrutiny during validation." Pipeline bundles get more walk-forward windows and a tighter consistency threshold in validation.
- **Demo**: an oversized bundle run that is rejected at the resource gate with the clear error and remediation steps, alongside a passing bundle.

## 7. Demo flow (mock data)

End-to-end simulated path: open Base Model Library → `meanrev-gbm-base` → Cloud Fine-Tune on ETH/USDT + SOL/USDT 1h → animated training with loss curve → auto backtest report → publish with a 15% per-trade fee → new model appears in the catalog with lineage badge, verified backtest badge, and fee; the base model's derivatives tree includes it.


## Technical notes

- Backend: migration adding `base_models` table (seeded with the three bases via literal INSERTs, public read for anon/authenticated) and lineage columns on `ai_models` (`base_model_id`, `base_version`, `finetune_method`), plus a `fine_tune_jobs` table for cloud runs. GRANTs + RLS on all new tables.
- Server functions in `src/lib/base-models.functions.ts` (public list/detail + derivatives tree) and `src/lib/fine-tune.functions.ts` (start job, poll progress, publish derivative), reusing `submitForValidation` from `backtest-validation.functions.ts` so derivatives hit the same pipeline.
- Training is simulated server-side (staged progress + synthetic loss curve), matching how the existing sandbox backtests work.
- Reuses existing marketplace card, trust badge, backtest report, and fee components; no changes to fee/watermark/trust-tier logic.
