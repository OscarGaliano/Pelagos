# URL que debes añadir en Supabase para que funcione Gmail/Facebook

La app ahora usa una **URL de callback fija**. Así Supabase siempre redirige al mismo sitio y el login no vuelve al inicio.

## Pasos en Supabase (obligatorios)

1. Entra en **[Supabase Dashboard](https://supabase.com/dashboard)** → tu proyecto.
2. **Authentication** → **URL Configuration**.
3. En **Redirect URLs** añade **exactamente** esta URL (cambia el puerto si usas otro):
   ```
   http://127.0.0.1:5177/auth/callback
   ```
   Si tu app corre en otro puerto (por ejemplo 5176), usa:
   ```
   http://127.0.0.1:5176/auth/callback
   ```
4. **Site URL** debe ser la URL donde abres la app, por ejemplo:
   ```
   http://127.0.0.1:5177
   ```
   (o `http://127.0.0.1:5176` si ese es tu puerto).
5. Pulsa **Save**.

## Cómo probar

1. Cierra todas las pestañas de la app.
2. Abre de nuevo `http://127.0.0.1:5177` (o tu puerto).
3. Pulsa **Continuar con Gmail**.
4. Inicia sesión en Google.
5. Deberías volver a la app y entrar directo en la **pantalla de Inicio** (Home).

Si sigue volviendo a la pantalla de login, revisa en la consola del navegador (F12 → Console) si hay errores y que la URL añadida en Supabase sea **exactamente** `http://127.0.0.1:TU_PUERTO/auth/callback` (sin barra final).
