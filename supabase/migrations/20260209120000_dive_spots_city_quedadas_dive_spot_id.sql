-- Ciudad en escenarios de pesca para clasificar por ciudades
alter table public.dive_spots
  add column if not exists city text;

comment on column public.dive_spots.city is 'Ciudad o zona para agrupar escenarios en listados';

-- En quedadas/salidas: poder elegir un escenario de pesca
alter table public.quedadas
  add column if not exists dive_spot_id uuid references public.dive_spots(id) on delete set null;

comment on column public.quedadas.dive_spot_id is 'Escenario de pesca elegido (opcional)';
