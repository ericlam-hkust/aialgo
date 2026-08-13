
-- enums
create type public.hosting_mode as enum ('hosted','remote');
create type public.trust_tier as enum ('platform_verified','live_verified','unproven');
create type public.frequency_class as enum ('hft','intraday','swing','position');
create type public.compute_plan as enum ('shared_cpu','dedicated_basic','dedicated_pro','gpu_metered');
create type public.signal_plan as enum ('metered','remote_pro','remote_hft');

-- listing columns
alter table public.ai_models
  add column hosting_mode public.hosting_mode not null default 'hosted',
  add column trust_tier public.trust_tier not null default 'unproven',
  add column declared_frequency public.frequency_class not null default 'swing',
  add column measured_frequency public.frequency_class,
  add column measured_latency_ms numeric not null default 0,
  add column avg_holding_hours numeric not null default 0,
  add column live_since timestamptz;

alter table public.model_transactions
  add column tier_bonus numeric not null default 0,
  add column listing_kind public.listing_kind not null default 'ai_model',
  add column hosting_mode public.hosting_mode not null default 'hosted';

-- signal gateway
create table public.signal_events (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_models(id) on delete cascade,
  contributor_id uuid references public.contributor_profiles(id) on delete set null,
  transport text not null default 'rest',
  symbol text not null default '',
  action text not null default 'hold',
  received_at timestamptz not null default now(),
  validation_ok boolean not null default true,
  validation_error text,
  subscribers_reached integer not null default 0,
  latency_ms numeric not null default 0
);
create index idx_signal_events_model on public.signal_events(model_id, received_at desc);
grant select on public.signal_events to authenticated;
grant all on public.signal_events to service_role;
alter table public.signal_events enable row level security;
create policy "owner or admin reads signal events" on public.signal_events for select to authenticated
  using (public.can_manage_model(model_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

create table public.gateway_status (
  model_id uuid primary key references public.ai_models(id) on delete cascade,
  status text not null default 'healthy',
  heartbeat_seconds integer not null default 300,
  last_signal_at timestamptz,
  p50_latency_ms numeric not null default 0,
  p95_latency_ms numeric not null default 0,
  error_rate numeric not null default 0,
  calls_today integer not null default 0,
  paused_reason text,
  updated_at timestamptz not null default now()
);
grant select on public.gateway_status to authenticated;
grant all on public.gateway_status to service_role;
alter table public.gateway_status enable row level security;
create policy "owner or admin reads gateway status" on public.gateway_status for select to authenticated
  using (public.can_manage_model(model_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "owner updates gateway status" on public.gateway_status for update to authenticated
  using (public.can_manage_model(model_id, auth.uid()));

-- contributor compute + signal plans
create table public.contributor_billing (
  contributor_id uuid primary key references public.contributor_profiles(id) on delete cascade,
  compute_plan public.compute_plan not null default 'shared_cpu',
  signal_plan public.signal_plan not null default 'metered',
  gpu_spend_cap numeric not null default 500,
  pending_signal_plan public.signal_plan,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.contributor_billing to authenticated;
grant all on public.contributor_billing to service_role;
alter table public.contributor_billing enable row level security;
create policy "own contributor billing" on public.contributor_billing for all to authenticated
  using (exists (select 1 from public.contributor_profiles c where c.id = contributor_id and c.user_id = auth.uid())
         or public.has_role(auth.uid(),'admin'))
  with check (exists (select 1 from public.contributor_profiles c where c.id = contributor_id and c.user_id = auth.uid()));

create table public.compute_usage (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.contributor_profiles(id) on delete cascade,
  model_id uuid references public.ai_models(id) on delete set null,
  period text not null,
  cpu_hours numeric not null default 0,
  gpu_hours numeric not null default 0,
  plan_cost numeric not null default 0,
  gpu_cost numeric not null default 0,
  platform_cost numeric not null default 0,
  created_at timestamptz not null default now()
);
create index idx_compute_usage_contrib on public.compute_usage(contributor_id, period);
grant select on public.compute_usage to authenticated;
grant all on public.compute_usage to service_role;
alter table public.compute_usage enable row level security;
create policy "own compute usage" on public.compute_usage for select to authenticated
  using (exists (select 1 from public.contributor_profiles c where c.id = contributor_id and c.user_id = auth.uid())
         or public.has_role(auth.uid(),'admin'));

create table public.signal_api_usage (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.contributor_profiles(id) on delete cascade,
  period text not null,
  plan public.signal_plan not null default 'metered',
  calls integer not null default 0,
  included_calls integer not null default 10000,
  overage_amount numeric not null default 0,
  flat_amount numeric not null default 0,
  p95_latency_ms numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (contributor_id, period)
);
grant select on public.signal_api_usage to authenticated;
grant all on public.signal_api_usage to service_role;
alter table public.signal_api_usage enable row level security;
create policy "own signal usage" on public.signal_api_usage for select to authenticated
  using (exists (select 1 from public.contributor_profiles c where c.id = contributor_id and c.user_id = auth.uid())
         or public.has_role(auth.uid(),'admin'));

-- data add-ons
create table public.data_addons (
  key text primary key,
  name text not null,
  description text not null,
  price numeric not null default 0,
  currency text not null default 'USD',
  bundled_in text[] not null default '{}',
  hft_required boolean not null default false,
  sort_order integer not null default 0
);
grant select on public.data_addons to anon, authenticated;
grant all on public.data_addons to service_role;
alter table public.data_addons enable row level security;
create policy "data addons are public" on public.data_addons for select using (true);

create table public.user_data_addons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  addon_key text not null references public.data_addons(key) on delete cascade,
  scope text not null default 'consumer',
  model_id uuid references public.ai_models(id) on delete set null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  unique (user_id, addon_key, scope)
);
grant select, insert, update, delete on public.user_data_addons to authenticated;
grant all on public.user_data_addons to service_role;
alter table public.user_data_addons enable row level security;
create policy "own data addons" on public.user_data_addons for all to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid());

-- broker referrals
create table public.referral_partners (
  key text primary key,
  name text not null,
  blurb text not null,
  url text not null,
  hft_compatible boolean not null default false,
  bounty numeric not null default 0,
  sort_order integer not null default 0
);
grant select on public.referral_partners to anon, authenticated;
grant all on public.referral_partners to service_role;
alter table public.referral_partners enable row level security;
create policy "referral partners are public" on public.referral_partners for select using (true);

create table public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_key text not null references public.referral_partners(key) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  converted boolean not null default false,
  revenue numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.referral_clicks to authenticated;
grant all on public.referral_clicks to service_role;
alter table public.referral_clicks enable row level security;
create policy "insert own referral click" on public.referral_clicks for insert to authenticated with check (user_id = auth.uid());
create policy "read own or admin referral clicks" on public.referral_clicks for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- promoted listings
create table public.promoted_listings (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_models(id) on delete cascade,
  contributor_id uuid references public.contributor_profiles(id) on delete set null,
  placement text not null default 'catalog',
  amount numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.promoted_listings to authenticated;
grant select on public.promoted_listings to anon;
grant all on public.promoted_listings to service_role;
alter table public.promoted_listings enable row level security;
create policy "promoted listings readable" on public.promoted_listings for select using (true);
create policy "owner manages promotion" on public.promoted_listings for insert to authenticated
  with check (public.can_manage_model(model_id, auth.uid()));
create policy "owner or admin updates promotion" on public.promoted_listings for update to authenticated
  using (public.can_manage_model(model_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

-- compliance
create table public.compliance_flags (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.ai_models(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text not null default '',
  status text not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert on public.compliance_flags to authenticated;
grant update on public.compliance_flags to authenticated;
grant all on public.compliance_flags to service_role;
alter table public.compliance_flags enable row level security;
create policy "report compliance" on public.compliance_flags for insert to authenticated with check (reporter_id = auth.uid());
create policy "read own or admin flags" on public.compliance_flags for select to authenticated
  using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin resolves flags" on public.compliance_flags for update to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- platform revenue ledger
create table public.platform_revenue_events (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  subcategory text not null default '',
  amount numeric not null default 0,
  cost numeric not null default 0,
  currency text not null default 'USD',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index idx_revenue_events_date on public.platform_revenue_events(occurred_on);
grant select on public.platform_revenue_events to authenticated;
grant all on public.platform_revenue_events to service_role;
alter table public.platform_revenue_events enable row level security;
create policy "admin reads revenue" on public.platform_revenue_events for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- settings
insert into public.platform_settings(key, value) values
  ('paid_discovery_enabled', 'false'::jsonb),
  ('commission_rates', '{"base":0.20,"pro_creator":0.15,"pro_creator_threshold":10000}'::jsonb)
on conflict (key) do nothing;

-- catalogue seed
insert into public.data_addons(key,name,description,price,bundled_in,hft_required,sort_order) values
  ('community','Community data','Delayed end-of-day and 15-minute community feeds.',0,'{free,pro,desk}',false,1),
  ('crypto_realtime','Real-time crypto','Live tick-aggregated crypto books across major venues.',15,'{pro,desk}',false,2),
  ('equities_realtime','Real-time equities','Live US and HK equities quotes and trades.',30,'{pro,desk}',false,3),
  ('premium_tick','Premium tick data','Full-depth tick history. Required for HFT backtests.',79,'{desk}',true,4)
on conflict (key) do nothing;

insert into public.referral_partners(key,name,blurb,url,hft_compatible,bounty,sort_order) values
  ('alpaca','Alpaca','Commission-free US equities and crypto with a first-class trading API.','https://alpaca.markets',true,120,1),
  ('ibkr','Interactive Brokers','Global multi-asset access, FIX and TWS API, institutional routing.','https://www.interactivebrokers.com',true,200,2),
  ('binance','Binance','Deep crypto liquidity with REST and WebSocket order APIs.','https://www.binance.com',false,90,3)
on conflict (key) do nothing;

-- classify existing listings deterministically
with ranked as (
  select id, row_number() over (order by created_at) as rn from public.ai_models
)
update public.ai_models m set
  hosting_mode = case when r.rn % 4 = 0 then 'remote'::public.hosting_mode else 'hosted'::public.hosting_mode end,
  declared_frequency = (array['swing','intraday','position','hft']::public.frequency_class[])[(r.rn % 4) + 1],
  measured_frequency = (array['swing','intraday','position','hft']::public.frequency_class[])[(r.rn % 4) + 1],
  measured_latency_ms = case when r.rn % 4 = 0 then 40 + (r.rn % 5) * 9 else 320 + (r.rn % 7) * 25 end,
  avg_holding_hours = (array[96, 5, 720, 0.4]::numeric[])[(r.rn % 4) + 1],
  live_since = now() - ((60 + (r.rn * 17) % 260) || ' days')::interval
from ranked r where m.id = r.id;

update public.ai_models set trust_tier = case
  when hosting_mode = 'hosted' and status in ('live','paper_trading') then 'platform_verified'::public.trust_tier
  when hosting_mode = 'remote' and live_since is not null and live_since < now() - interval '90 days' then 'live_verified'::public.trust_tier
  else 'unproven'::public.trust_tier end;

-- gateway status + signal history for remote models
insert into public.gateway_status(model_id, status, heartbeat_seconds, last_signal_at, p50_latency_ms, p95_latency_ms, error_rate, calls_today)
select id, 'healthy', case when declared_frequency = 'hft' then 60 else 900 end, now() - interval '3 minutes',
       case when declared_frequency = 'hft' then 34 else 210 end,
       case when declared_frequency = 'hft' then 82 else 410 end,
       0.6, case when declared_frequency = 'hft' then 4820 else 190 end
from public.ai_models where hosting_mode = 'remote'
on conflict (model_id) do nothing;

insert into public.signal_events(model_id, contributor_id, transport, symbol, action, received_at, validation_ok, validation_error, subscribers_reached, latency_ms)
select m.id, m.contributor_id,
       case when m.declared_frequency = 'hft' then 'websocket' else 'rest' end,
       (array['BTCUSDT','AAPL','0700.HK','ETHUSDT','SPY'])[1 + (g % 5)],
       (array['buy','sell','hold'])[1 + (g % 3)],
       now() - (g || ' hours')::interval,
       (g % 29) <> 0,
       case when (g % 29) = 0 then 'schema: missing field "confidence"' else null end,
       greatest(1, m.active_users - (g % 7)),
       case when m.declared_frequency = 'hft' then 28 + (g % 60) else 180 + (g % 320) end
from public.ai_models m cross join generate_series(0, 179) g
where m.hosting_mode = 'remote';

-- contributor billing + usage
insert into public.contributor_billing(contributor_id, compute_plan, signal_plan, gpu_spend_cap)
select c.id,
  case when exists (select 1 from public.ai_models m where m.contributor_id = c.id and m.listing_kind = 'ai_model' and m.hosting_mode='hosted')
       then 'dedicated_pro'::public.compute_plan else 'shared_cpu'::public.compute_plan end,
  case when exists (select 1 from public.ai_models m where m.contributor_id = c.id and m.hosting_mode='remote' and m.declared_frequency='hft')
       then 'remote_hft'::public.signal_plan
       when exists (select 1 from public.ai_models m where m.contributor_id = c.id and m.hosting_mode='remote')
       then 'metered'::public.signal_plan else 'metered'::public.signal_plan end,
  500
from public.contributor_profiles c
on conflict (contributor_id) do nothing;

insert into public.compute_usage(contributor_id, model_id, period, cpu_hours, gpu_hours, plan_cost, gpu_cost, platform_cost)
select m.contributor_id, m.id,
  to_char(date_trunc('month', now()) - (k || ' months')::interval, 'YYYY-MM'),
  620 + (k * 13) % 90,
  case when m.listing_kind = 'ai_model' then 18 + (k * 7) % 22 else 0 end,
  case when m.listing_kind = 'ai_model' then 99 else 29 end,
  case when m.listing_kind = 'ai_model' then round((18 + (k * 7) % 22) * 0.80, 2) else 0 end,
  case when m.listing_kind = 'ai_model' then 46 else 11 end
from public.ai_models m cross join generate_series(0,5) k
where m.hosting_mode = 'hosted';

insert into public.signal_api_usage(contributor_id, period, plan, calls, included_calls, overage_amount, flat_amount, p95_latency_ms)
select distinct on (m.contributor_id, k) m.contributor_id,
  to_char(date_trunc('month', now()) - (k || ' months')::interval, 'YYYY-MM'),
  case when m.declared_frequency = 'hft' then 'remote_hft'::public.signal_plan else 'metered'::public.signal_plan end,
  case when m.declared_frequency = 'hft' then 1240000 + k * 21000 else 8400 + k * 1900 end,
  10000,
  case when m.declared_frequency = 'hft' then 0 else greatest(0, ceil(((8400 + k * 1900) - 10000)::numeric / 1000) * 5) end,
  case when m.declared_frequency = 'hft' then 499 else 0 end,
  case when m.declared_frequency = 'hft' then 82 else 410 end
from public.ai_models m cross join generate_series(0,5) k
where m.hosting_mode = 'remote'
on conflict (contributor_id, period) do nothing;

-- revenue ledger: 180 days of realistic platform revenue lines
insert into public.platform_revenue_events(category, subcategory, amount, cost, occurred_on)
select cat.category, cat.subcategory,
  round((cat.base + (d * cat.growth) + ((d * 37) % 11) * cat.noise)::numeric, 2),
  round((cat.base * cat.margin)::numeric, 2),
  (current_date - d)
from generate_series(0, 179) d
cross join (values
  ('subscription','Pro plan', 640.0, 1.4, 22.0, 0.0),
  ('subscription','Desk plan', 380.0, 1.1, 30.0, 0.0),
  ('commission','AI model', 210.0, 0.9, 18.0, 0.0),
  ('commission','Algo strategy', 140.0, 0.6, 12.0, 0.0),
  ('commission','Remote HFT', 95.0, 0.8, 14.0, 0.0),
  ('compute','Algo CPU', 58.0, 0.2, 6.0, 0.42),
  ('compute','AI CPU', 132.0, 0.4, 9.0, 0.48),
  ('compute','GPU', 176.0, 0.7, 15.0, 0.61),
  ('signal_api','Standard', 44.0, 0.2, 5.0, 0.18),
  ('signal_api','HFT tier', 118.0, 0.5, 8.0, 0.26),
  ('data','Data add-ons', 96.0, 0.3, 7.0, 0.35),
  ('referral','Broker partners', 62.0, 0.25, 9.0, 0.0),
  ('promoted','Promoted listings', 38.0, 0.15, 6.0, 0.0)
) as cat(category, subcategory, base, growth, noise, margin);
