-- Enlazar jornadas a escenarios de pesca (opcional).
ALTER TABLE public.dives
  ADD COLUMN IF NOT EXISTS dive_spot_id uuid REFERENCES public.dive_spots(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.dives.dive_spot_id IS 'Escenario de pesca donde se realizó la jornada (opcional).';
