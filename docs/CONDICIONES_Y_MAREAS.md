# Condiciones y Mareas – Arquitectura y despliegue

## Arquitectura (resumen)

- **Frontend (React)** no llama a APIs externas. Solo llama a Supabase:
  - `zonas` (Postgres) para listar zonas.
  - Edge Functions `getZonaConditions` y `getZonaTides` para obtener datos.
- **Edge Functions** consultan Open-Meteo (weather + marine) o generan mareas mock, y **escriben/leen** la tabla `zona_cache` en Postgres (con **service_role**).
- **Cache por zona** (compartido entre todos los usuarios):
  - `weather` → válido 30 minutos
  - `marine` → válido 60 minutos
  - `tides` → válido 24 horas

Así se evitan llamadas repetidas a APIs externas y el sistema escala bien. Para añadir APIs premium, alertas o históricos solo hay que extender las Edge Functions o añadir nuevas; el frontend sigue igual.

## Desplegar Edge Functions

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) enlazada al proyecto:

```bash
cd "Premium Spearfishing App UI"
supabase functions deploy getZonaConditions
supabase functions deploy getZonaTides
```

Las funciones usan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (se inyectan en el entorno de las funciones en Supabase; no hace falta configurarlas a mano en desarrollo local si despliegas a Supabase Cloud).

## Tablas ya creadas (migración aplicada)

- **zonas**: id, nombre, lat, lon. Con algunas filas de ejemplo (Costa Brava, Maresme, Cabo de Palos).
- **zona_cache**: zona_id, tipo (weather | marine | tides), data (jsonb), updated_at. RLS: lectura pública; escritura solo desde Edge Functions (service_role).

## Añadir más zonas

Desde SQL o desde el Dashboard (Supabase → Table Editor → `zonas`):

```sql
insert into public.zonas (nombre, lat, lon) values
  ('Tu zona', 42.5, 3.2);
```

## Mareas (futuro)

Actualmente las mareas son **mock** por zona/día. Para usar una API de mareas real (p. ej. con API key):

1. En la Edge Function `getZonaTides`, sustituir `generateMockTides(...)` por una llamada `fetch()` a la API de mareas.
2. Mantener el mismo formato de respuesta (`events: [{ type, time, height_m }], coefficient`) para no tocar el frontend.

## Flutter

Este proyecto es **React (Vite + TypeScript)**. Si en el futuro tienes una app Flutter:

- Flutter solo debe llamar a las mismas Edge Functions (`getZonaConditions`, `getZonaTides`) con el mismo cuerpo (`zona_id`).
- La lógica de cache y APIs externas sigue en Supabase; Flutter no llama a Open-Meteo ni a otras APIs directamente.
