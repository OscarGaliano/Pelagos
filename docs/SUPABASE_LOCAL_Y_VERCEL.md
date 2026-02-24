# Supabase: usar la app en local y en Vercel

La app usa **Supabase Auth** (Google, etc.). Para que funcione tanto en **local** como en **Vercel**, hay que permitir las URLs de redirección en el proyecto de Supabase.

## Pasos en el Dashboard de Supabase

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) y abre tu proyecto.
2. Ve a **Authentication** → **URL Configuration**.
3. En **Site URL** usa la URL **completa** de producción (con `https://`), por ejemplo:
   - `https://pelagos.vercel.app`
   - No pongas solo `pelagos.vercel.app` (sin protocolo), o las peticiones pueden ir mal.
4. En **Redirect URLs** añade **solo URLs completas** (con `http://` o `https://`), por ejemplo:

   - `https://pelagos.vercel.app/auth/callback`
   - `https://pelagos.vercel.app/**`
   - `http://127.0.0.1:5178/auth/callback`
   - `http://localhost:5178/auth/callback`

   Si Vite usa otro puerto (5179, 5180…), añade también:

   - `http://127.0.0.1:5179/auth/callback`
   - `http://localhost:5179/auth/callback`

5. Guarda los cambios.

## Cómo funciona

- En **local**: la app usa `window.location.origin` (ej. `http://127.0.0.1:5178`), así que el redirect después de login es `http://127.0.0.1:5178/auth/callback`. Esa URL debe estar en **Redirect URLs**.
- En **Vercel**: el origin es `https://pelagos.vercel.app`, así que el redirect es `https://pelagos.vercel.app/auth/callback`. Esa URL también debe estar permitida.

Mientras **Site URL** sea la de Vercel, la producción seguirá igual; al desarrollar en local, al tener las URLs locales en **Redirect URLs**, el login funcionará en ambos entornos.

## Variables de entorno

- **Local**: copia `.env.example` a `.env` y usa las mismas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` que en Vercel (o las de tu proyecto).
- **Vercel**: configura esas mismas variables en el proyecto de Vercel.

No hace falta una URL de app distinta por entorno: la app detecta el origen con `window.location.origin`.
