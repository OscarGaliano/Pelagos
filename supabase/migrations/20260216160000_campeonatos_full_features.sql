-- Los campeonatos ahora tienen las mismas funcionalidades que las ligas
-- Añadimos campo para tipo de competición: por pieza mayor o por rancho (conjunto de capturas)
alter table public.leagues
  add column if not exists competition_type text default 'rancho' check (competition_type in ('pieza_mayor', 'rancho'));

comment on column public.leagues.competition_type is 'Tipo de competición: pieza_mayor (gana la captura más grande) o rancho (suma de capturas)';
