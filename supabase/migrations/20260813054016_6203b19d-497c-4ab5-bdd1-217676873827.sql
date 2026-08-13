alter table public.ai_models add column if not exists interface_manifest jsonb not null default '{}'::jsonb;

alter table public.model_activations
  add column if not exists max_open_positions integer not null default 5,
  add column if not exists signals_consumed integer not null default 0,
  add column if not exists executions_count integer not null default 0,
  add column if not exists last_signal_at timestamptz;

alter table public.broker_connections
  add column if not exists nickname text,
  add column if not exists is_default boolean not null default false;

create table if not exists public.execution_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activation_id uuid not null references public.model_activations(id) on delete cascade,
  model_id uuid references public.ai_models(id) on delete set null,
  symbol text not null,
  action text not null,
  confidence numeric not null default 0,
  position_size_pct numeric not null default 0,
  stop_loss numeric,
  take_profit numeric,
  status text not null default 'passed',
  block_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.execution_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activation_id uuid not null references public.model_activations(id) on delete cascade,
  signal_id uuid references public.execution_signals(id) on delete set null,
  broker_connection_id uuid references public.broker_connections(id) on delete set null,
  symbol text not null,
  side text not null,
  quantity numeric not null default 0,
  price numeric not null default 0,
  notional numeric not null default 0,
  realized_pnl numeric not null default 0,
  status text not null default 'filled',
  created_at timestamptz not null default now()
);

create index if not exists execution_signals_activation_idx on public.execution_signals(activation_id, created_at desc);
create index if not exists execution_orders_activation_idx on public.execution_orders(activation_id, created_at desc);

grant select, insert, update, delete on public.execution_signals to authenticated;
grant all on public.execution_signals to service_role;
grant select, insert, update, delete on public.execution_orders to authenticated;
grant all on public.execution_orders to service_role;

alter table public.execution_signals enable row level security;
alter table public.execution_orders enable row level security;

create policy "Users manage their own signals" on public.execution_signals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own execution orders" on public.execution_orders
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);