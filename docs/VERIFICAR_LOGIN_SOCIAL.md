# Checklist: verificar que el login social esté bien configurado

Usa esta lista para comprobar que todo está correcto después de seguir los pasos de configuración.

---

## 1. Variables de entorno (.env)

En la carpeta **Premium Spearfishing App UI** debe existir un archivo **`.env`** (no solo `.env.example`).

- [ ] Existe el archivo `.env`
- [ ] Contiene y está rellenado:
  ```env
  VITE_SUPABASE_URL=https://upaqwhabkeqtdhfihlyd.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ... (tu anon key real del Dashboard)
  ```
- [ ] La **anon key** la copias de: Supabase Dashboard → **Project Settings** → **API** → **Project API keys** → **anon** **public**

Si falta o está mal la URL o la key, los botones de Google/Facebook no podrán conectar con Supabase.

---

## 2. Supabase – URL Configuration

En **Supabase Dashboard** → **Authentication** → **URL Configuration**:

- [ ] **Site URL** está definida. En desarrollo, por ejemplo:

  - `http://127.0.0.1:5173`
  - o `http://localhost:5173`
    (usa el mismo puerto que ves en la terminal al hacer `npm run dev`)

- [ ] En **Redirect URLs** está permitida la URL donde se abre tu app. Añade **todas** las que apliquen (para evitar que "vuelva a pantalla de inicio" sin sesión):
  - `http://127.0.0.1:5173/**`
  - `http://127.0.0.1:5173`
  - `http://127.0.0.1:5173/`
    Si usas otro puerto (ej. 5176 o 5177), añade también esas mismas variantes, por ejemplo:
  - `http://127.0.0.1:5176/**`
  - `http://127.0.0.1:5176`
  - `http://127.0.0.1:5176/`

Si la URL a la que redirige Supabase no está en esta lista, volverás a la pantalla de login/registro después de aceptar en Google/Facebook (sin crear sesión).

---

## 3. Supabase – Proveedor Google

En **Authentication** → **Providers** → **Google**:

- [ ] Está **Enabled** (activado).
- [ ] **Client ID** tiene un valor tipo: `xxxxx.apps.googleusercontent.com`
- [ ] **Client Secret** tiene un valor (empieza por `GOCSPX-` o similar).

En **Google Cloud Console** (credenciales OAuth):

- [ ] En “URIs de redirección autorizados” está:
  - `https://upaqwhabkeqtdhfihlyd.supabase.co/auth/v1/callback`

---

## 4. Supabase – Proveedor Facebook

En **Authentication** → **Providers** → **Facebook**:

- [ ] Está **Enabled**.
- [ ] **Client ID** = ID de aplicación de Meta (App ID).
- [ ] **Client Secret** = Clave secreta de la aplicación (App Secret).

En **Meta for Developers** (tu app → Facebook Login → Configuración):

- [ ] En “URI de redirección de OAuth válidos” está:
  - `https://upaqwhabkeqtdhfihlyd.supabase.co/auth/v1/callback`

---

## 5. Probar el flujo

1. Reinicia el servidor de desarrollo (`npm run dev`) para que cargue el `.env`.
2. Abre la app en la URL que indica la terminal (ej. `http://127.0.0.1:5173`).
3. Pulsa **“Continuar con Gmail”** o **“Continuar con Facebook”**.
4. Comprueba:
   - [ ] Te redirige a la pantalla de Google o Facebook.
   - [ ] Tras iniciar sesión y aceptar, vuelves a tu app.
   - [ ] La app te lleva a la pantalla de Inicio (home).

Si al volver ves la pantalla de login otra vez o una página en blanco, abre la consola del navegador (F12 → Console) y revisa si hay errores. Suele deberse a:

- Redirect URL no permitida en Supabase (apartado 2).
- Client ID o Secret incorrectos en Supabase o en Google/Facebook (apartados 3 y 4).

---

## Resumen rápido

| Dónde                            | Qué comprobar                                                              |
| -------------------------------- | -------------------------------------------------------------------------- |
| **.env**                         | `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` correctos                   |
| **Supabase → URL Configuration** | Site URL y Redirect URLs con `http://127.0.0.1:5173` (o tu puerto)         |
| **Supabase → Google**            | Enabled, Client ID y Client Secret rellenados                              |
| **Supabase → Facebook**          | Enabled, Client ID y Client Secret rellenados                              |
| **Google Cloud**                 | Redirect URI = `https://upaqwhabkeqtdhfihlyd.supabase.co/auth/v1/callback` |
| **Meta / Facebook**              | Redirect URI = `https://upaqwhabkeqtdhfihlyd.supabase.co/auth/v1/callback` |

Cuando todo esté marcado y el flujo de prueba funcione, la configuración es correcta.
