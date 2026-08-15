ALTER TABLE public.data_source_connections
  ADD COLUMN IF NOT EXISTS broker_connection_id uuid REFERENCES public.broker_connections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS data_source_connections_broker_idx
  ON public.data_source_connections(broker_connection_id);