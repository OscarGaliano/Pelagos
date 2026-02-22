-- ============================================
-- Panel de Administración v3
-- Soporte para múltiples enlaces en secciones
-- NO DESTRUCTIVO - Solo añade, nunca elimina
-- ============================================

-- Añadir columna links a home_sections para soportar múltiples enlaces
alter table public.home_sections
  add column if not exists links jsonb default '[]';
