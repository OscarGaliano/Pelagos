-- Lugar de quedada con coordenadas (mapa) y lugar de pesca (texto o zona)
alter table public.quedadas
  add column if not exists place_lat numeric,
  add column if not exists place_lng numeric,
  add column if not exists lugar_pesca text,
  add column if not exists zona_id uuid references public.zonas(id) on delete set null;

comment on column public.quedadas.place_lat is 'Latitud del punto de encuentro (mapa)';
comment on column public.quedadas.place_lng is 'Longitud del punto de encuentro (mapa)';
comment on column public.quedadas.lugar_pesca is 'Lugar de pesca: texto libre o nombre de zona';
comment on column public.quedadas.zona_id is 'Zona de pesca elegida (opcional)';
