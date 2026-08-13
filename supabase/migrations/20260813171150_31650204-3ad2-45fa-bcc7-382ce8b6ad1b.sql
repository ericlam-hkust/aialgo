CREATE TABLE IF NOT EXISTS public.market_data_intraday (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  interval text not null,
  ts timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null default 0,
  provider text,
  created_at timestamptz not null default now(),
  unique (symbol, interval, ts)
);

GRANT SELECT ON public.market_data_intraday TO anon, authenticated;
GRANT ALL ON public.market_data_intraday TO service_role;

ALTER TABLE public.market_data_intraday ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Intraday market data is readable by everyone"
ON public.market_data_intraday FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS market_data_intraday_symbol_ts_idx
  ON public.market_data_intraday (symbol, interval, ts DESC);