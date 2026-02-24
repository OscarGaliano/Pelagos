-- Añadir medida (longitud en cm) a las capturas de jornada
alter table public.catches
  add column if not exists length_cm numeric;

comment on column public.catches.length_cm is 'Longitud de la pieza en centímetros (medida).';
