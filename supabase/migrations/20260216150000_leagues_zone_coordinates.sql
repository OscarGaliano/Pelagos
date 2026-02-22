-- Coordenadas de zona de pesca: punto o polígono dibujado en el mapa
alter table public.leagues
  add column if not exists zone_point jsonb,
  add column if not exists zone_polygon jsonb;

comment on column public.leagues.zone_point is 'Punto de zona de pesca: {lat, lng}';
comment on column public.leagues.zone_polygon is 'Polígono de zona de pesca: [[lat, lng], ...]';
