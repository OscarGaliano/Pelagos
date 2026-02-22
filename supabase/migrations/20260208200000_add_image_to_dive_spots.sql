-- Foto del sitio (opcional) para cada escenario de pesca.
ALTER TABLE public.dive_spots
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.dive_spots.image_url IS 'URL de la foto del sitio (Storage público).';
