-- Profundidad (desde/hasta) y corriente para jornadas
ALTER TABLE public.dives
  ADD COLUMN IF NOT EXISTS min_depth_m numeric,
  ADD COLUMN IF NOT EXISTS current_type text;

COMMENT ON COLUMN public.dives.min_depth_m IS 'Profundidad mínima (desde) en metros';
COMMENT ON COLUMN public.dives.current_type IS 'Corriente: sin corriente, media o alta';
