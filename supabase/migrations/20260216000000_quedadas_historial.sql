-- Migración: Sistema de historial de quedadas/salidas
-- Añade campos para gestionar eventos completados y sus resúmenes

-- Estado de la quedada: active (pendiente), completed (pasada la fecha)
ALTER TABLE public.quedadas 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed'));

-- Resumen escrito por el admin después del evento
ALTER TABLE public.quedadas 
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Fecha de publicación del resumen (null = no publicado)
ALTER TABLE public.quedadas 
ADD COLUMN IF NOT EXISTS summary_published_at TIMESTAMPTZ;

-- Fotos del resumen (array de URLs)
ALTER TABLE public.quedadas 
ADD COLUMN IF NOT EXISTS summary_images TEXT[];

-- Flag para saber si ya se notificó al admin para escribir resumen
ALTER TABLE public.quedadas 
ADD COLUMN IF NOT EXISTS summary_notified BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_quedadas_status ON public.quedadas(status);

-- Índice para resúmenes publicados (para novedades)
CREATE INDEX IF NOT EXISTS idx_quedadas_summary_published ON public.quedadas(summary_published_at) WHERE summary_published_at IS NOT NULL;
