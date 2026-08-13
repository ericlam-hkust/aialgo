CREATE TABLE IF NOT EXISTS public.base_models (
  id text PRIMARY KEY,
  name text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  listing_kind text NOT NULL DEFAULT 'ai_model',
  architecture text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  docs text NOT NULL DEFAULT '',
  instruments text[] NOT NULL DEFAULT '{}',
  timeframes text[] NOT NULL DEFAULT '{}',
  data_start date,
  data_end date,
  feature_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  trainable jsonb NOT NULL DEFAULT '[]'::jsonb,
  frozen jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  compute_estimate text NOT NULL DEFAULT '',
  package_contents jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.base_models TO anon;
GRANT SELECT ON public.base_models TO authenticated;
GRANT ALL ON public.base_models TO service_role;

ALTER TABLE public.base_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Base models are readable by everyone"
  ON public.base_models FOR SELECT
  USING (true);

CREATE POLICY "Admins manage base models"
  ON public.base_models FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_base_models_updated_at
  BEFORE UPDATE ON public.base_models
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.fine_tune_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_model_id text NOT NULL REFERENCES public.base_models(id) ON DELETE CASCADE,
  base_version text NOT NULL DEFAULT '1.0.0',
  instruments text[] NOT NULL DEFAULT '{}',
  timeframe text NOT NULL DEFAULT '1h',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running',
  progress integer NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'preparing',
  stage_message text NOT NULL DEFAULT '',
  loss_curve jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  model_id uuid,
  backtest_job_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fine_tune_jobs TO authenticated;
GRANT ALL ON public.fine_tune_jobs TO service_role;

ALTER TABLE public.fine_tune_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own fine-tune jobs"
  ON public.fine_tune_jobs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_fine_tune_jobs_updated_at
  BEFORE UPDATE ON public.fine_tune_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS base_model_id text REFERENCES public.base_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_version text,
  ADD COLUMN IF NOT EXISTS finetune_method text,
  ADD COLUMN IF NOT EXISTS pipeline jsonb,
  ADD COLUMN IF NOT EXISTS resources jsonb;

INSERT INTO public.base_models (id, name, version, listing_kind, architecture, tagline, description, docs, instruments, timeframes, data_start, data_end, feature_schema, trainable, frozen, recommended_settings, baseline_metrics, compute_estimate, package_contents)
VALUES
(
  'momentum-lstm-base', 'momentum-lstm-base', '2.0.0', 'ai_model',
  '3-layer LSTM sequence encoder (128 hidden units) + linear signal head',
  'Pretrained cross-sectional momentum encoder for equities.',
  'Trained on eight years of US and HK equity bars to encode multi-horizon momentum structure. The encoder produces a 64-dimensional state that the signal head maps to directional conviction. Fine-tune the head (and optionally the last LSTM block) on your own instrument set.',
  'The encoder was pretrained with a self-supervised next-return objective on adjusted OHLCV bars, then lightly supervised on forward 5-bar returns. Derivatives must keep the feature schema and the signal output contract intact.',
  ARRAY['AAPL','TSLA','SPY','QQQ','0700.HK','9988.HK'], ARRAY['1h','1d'], '2016-01-01', '2024-12-31',
  '[{"field":"open","type":"number","note":"Adjusted open"},{"field":"high","type":"number","note":"Adjusted high"},{"field":"low","type":"number","note":"Adjusted low"},{"field":"close","type":"number","note":"Adjusted close"},{"field":"volume","type":"number","note":"Session volume"},{"field":"ret_1","type":"number","note":"1-bar log return"},{"field":"ret_5","type":"number","note":"5-bar log return"},{"field":"rsi_14","type":"number","note":"Relative strength index"},{"field":"atr_14","type":"number","note":"Average true range"}]'::jsonb,
  '["signal_head","last_lstm_block","entry_exit_thresholds","position_sizing"]'::jsonb,
  '["input_normalizer","lstm_block_1","lstm_block_2","feature_schema","output_contract"]'::jsonb,
  '{"trainingWindowMonths":24,"epochs":12,"learningRate":0.0005,"entryThreshold":0.55,"exitThreshold":0.45}'::jsonb,
  '{"sharpe":1.32,"cagr":0.18,"maxDrawdown":0.164,"winRate":0.54,"trades":1840}'::jsonb,
  '~6 min on platform sandbox GPU (free for contributors)',
  '["weights/encoder.safetensors","weights/head.safetensors","manifest.template.json","data/sample_bars.parquet","notebooks/finetune_momentum_lstm.ipynb","README.md"]'::jsonb
),
(
  'meanrev-gbm-base', 'meanrev-gbm-base', '2.1.0', 'ai_model',
  'Gradient-boosted trees (600 estimators, depth 6) over spread-reversion features',
  'Pretrained mean-reversion classifier for crypto majors.',
  'A gradient boosting ensemble pretrained on crypto major pairs to score short-horizon reversion probability from z-scored spreads, volatility regime and order-flow proxies. Fine-tune the final boosting rounds and thresholds on your own pairs.',
  'Feature construction is frozen so verified backtests stay comparable across derivatives. You may retrain the last 200 boosting rounds and tune entry/exit thresholds and the training window.',
  ARRAY['BTC/USDT','ETH/USDT','SOL/USDT','BNB/USDT'], ARRAY['15m','1h'], '2018-01-01', '2024-12-31',
  '[{"field":"close","type":"number","note":"Close price"},{"field":"volume","type":"number","note":"Base volume"},{"field":"zscore_20","type":"number","note":"20-bar z-score of close"},{"field":"bb_width","type":"number","note":"Bollinger band width"},{"field":"rsi_14","type":"number","note":"Relative strength index"},{"field":"realized_vol_24","type":"number","note":"24-bar realized volatility"},{"field":"vol_regime","type":"number","note":"Volatility regime bucket 0-2"}]'::jsonb,
  '["final_boosting_rounds","entry_threshold","exit_threshold","training_window","position_sizing"]'::jsonb,
  '["feature_builder","zscore_window","output_contract","feature_schema"]'::jsonb,
  '{"trainingWindowMonths":18,"epochs":8,"learningRate":0.05,"entryThreshold":2.0,"exitThreshold":0.5}'::jsonb,
  '{"sharpe":1.47,"cagr":0.226,"maxDrawdown":0.138,"winRate":0.58,"trades":3120}'::jsonb,
  '~4 min on platform sandbox CPU (free for contributors)',
  '["model/gbm_booster.json","model/feature_builder.py","manifest.template.json","data/sample_1h.parquet","notebooks/finetune_meanrev_gbm.ipynb","README.md"]'::jsonb
),
(
  'rsi-grid-algo-base', 'rsi-grid-algo-base', '1.4.0', 'algo',
  'Rule-based RSI grid with volatility-scaled ladder spacing',
  'Parameterised RSI grid skeleton for forex and crypto.',
  'A deterministic grid strategy skeleton. There are no learned weights: derivatives adapt it by tuning the ladder parameters against their instrument set. Published derivatives are marked as adapted rather than fine-tuned.',
  'Because this base has no trained weights, cloud fine-tuning performs a parameter search rather than gradient training. The entry/exit rule structure and output contract are frozen.',
  ARRAY['EUR/USD','GBP/USD','BTC/USDT','ETH/USDT'], ARRAY['1h','4h'], '2015-01-01', '2024-12-31',
  '[{"field":"close","type":"number","note":"Close price"},{"field":"rsi_14","type":"number","note":"Relative strength index"},{"field":"atr_14","type":"number","note":"Average true range"},{"field":"ema_50","type":"number","note":"Trend filter"}]'::jsonb,
  '["grid_levels","grid_spacing_atr","rsi_entry","rsi_exit","max_ladder_size"]'::jsonb,
  '["rule_structure","output_contract","feature_schema"]'::jsonb,
  '{"trainingWindowMonths":12,"epochs":1,"learningRate":0,"entryThreshold":30,"exitThreshold":60}'::jsonb,
  '{"sharpe":0.98,"cagr":0.121,"maxDrawdown":0.192,"winRate":0.61,"trades":2410}'::jsonb,
  '~2 min parameter sweep on platform sandbox (free for contributors)',
  '["strategy/rsi_grid.py","manifest.template.json","data/sample_4h.parquet","notebooks/adapt_rsi_grid.ipynb","README.md"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;