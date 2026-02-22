# Cómo configurar inicio de sesión con Google y Facebook

Supabase te pide **Client ID** y **Client Secret** (a veces llamados "client"). Son las credenciales que obtienes en la consola de cada proveedor (Google o Facebook). Sigue estos pasos.

---

## Parte 1: Configurar Google (Gmail)

### Paso 1 – Crear proyecto en Google Cloud

1. Entra en **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Arriba, en el selector de proyecto, haz clic en el nombre del proyecto.
3. Pulsa **"Nuevo proyecto"**.
4. Nombre: por ejemplo `Pelagos` o `Mi App Pesca`.
5. Pulsa **"Crear"** y espera. Luego selecciona ese proyecto.

### Paso 2 – Activar la API y crear credenciales

1. En el menú lateral: **APIs y servicios** → **Credenciales**.
2. Arriba: **"+ Crear credenciales"** → **"ID de cliente de OAuth"**.
3. Si te pide **"Configurar pantalla de consentimiento"**:
   - Tipo de usuario: **Externo** (para que cualquier cuenta Google pueda entrar).
   - Nombre de la aplicación: por ejemplo `Pelagos`.
   - Correo de asistencia: tu email.
   - Guarda y continúa hasta volver a Credenciales.
4. De nuevo: **"+ Crear credenciales"** → **"ID de cliente de OAuth"**.
5. **Tipo de aplicación:** **Aplicación web**.
6. **Nombre:** por ejemplo `Pelagos Web`.
7. **URIs de redirección autorizados** – añade **estas dos** (una por línea):
   - Para desarrollo local:
     ```
     http://127.0.0.1:5173/
     ```
   - Callback de Supabase (obligatorio):
     ```
     https://upaqwhabkeqtdhfihlyd.supabase.co/auth/v1/callback
     ```
     Si usas otro puerto (ej. 5174), añade también `http://127.0.0.1:5174/`.
8. Pulsa **"Crear"**.
9. Se abrirá un popup con:
   - **ID de cliente (Client ID):** algo como `123456789-xxxx.apps.googleusercontent.com`
   - **Secreto de cliente (Client Secret):** una cadena tipo `GOCSPX-xxxx`
10. **Cópialos** (o descarga el JSON y guárdalos). Los usarás en Supabase.

### Paso 3 – Poner Google en Supabase

1. Entra en **[Supabase Dashboard](https://supabase.com/dashboard)** → tu proyecto.
2. Menú izquierdo: **Authentication** → **Providers**.
3. Busca **Google** y actívalo (toggle en **Enabled**).
4. Rellena:
   - **Client ID (for OAuth):** pega el **ID de cliente** de Google.
   - **Client Secret (for OAuth):** pega el **Secreto de cliente** de Google.
5. Guarda (**Save**).

Con esto, el “client” que te pide Supabase para Google son: **Client ID** + **Client Secret** que acabas de crear en Google Cloud.

---

## Parte 2: Configurar Facebook

### Paso 1 – Crear app en Meta

1. Entra en **[Meta for Developers](https://developers.facebook.com/)**.
2. **Mis aplicaciones** → **Crear aplicación**.
3. Tipo: **Consumidor** (o el que más se acerque a “web / login”).
4. Nombre: por ejemplo `Pelagos`. Crea la app.

### Paso 2 – Añadir producto “Inicio de sesión con Facebook”

1. En el panel de tu app, en **Configuración del producto**, busca **"Inicio de sesión con Facebook"** (Facebook Login).
2. Pulsa **"Configurar"** o **"Añadir"**.
3. Elige **"Web"**.
4. **URL del sitio:** en desarrollo pon por ejemplo:
   ```
   http://127.0.0.1:5173
   ```
5. **URI de redirección de OAuth válidos** – añade el callback de Supabase:
   ```
   https://upaqwhabkeqtdhfihlyd.supabase.co/auth/v1/callback
   ```
6. Guarda los cambios.

### Paso 3 – Obtener App ID y App Secret

1. En el menú de la app: **Configuración** → **Básica**.
2. Ahí verás:
   - **ID de aplicación (App ID):** número largo. Ese es tu **Client ID** para Supabase.
   - **Clave secreta de la aplicación (App Secret):** haz clic en **"Mostrar"** y copia. Ese es tu **Client Secret** para Supabase.

### Paso 4 – Poner Facebook en Supabase

1. En **Supabase** → **Authentication** → **Providers**.
2. Activa **Facebook** (toggle **Enabled**).
3. Rellena:
   - **Client ID (for OAuth):** pega el **ID de aplicación (App ID)** de Facebook.
   - **Client Secret (for OAuth):** pega la **Clave secreta (App Secret)** de Facebook.
4. Guarda (**Save**).

El “client” que pide Supabase para Facebook son: **App ID** (Client ID) + **App Secret** (Client Secret) de la app de Meta.

---

## Parte 3: URL de redirección en Supabase

Para que al volver de Google/Facebook no falle:

1. En Supabase: **Authentication** → **URL Configuration**.
2. **Site URL:** pon la URL donde se abre tu app, por ejemplo:
   - Desarrollo: `http://127.0.0.1:5173`
   - Producción: `https://tudominio.com`
3. **Redirect URLs:** asegúrate de que esté permitida la misma URL (o añádela si aparece la lista). Por ejemplo:
   - `http://127.0.0.1:5173/**`
   - `http://127.0.0.1:5173`

Guarda los cambios.

---

## Resumen: qué poner en “Client” en Supabase

| Proveedor    | En Supabase “Client ID”                                               | En Supabase “Client Secret”                         |
| ------------ | --------------------------------------------------------------------- | --------------------------------------------------- |
| **Google**   | ID de cliente de Google Cloud (tipo `xxx.apps.googleusercontent.com`) | Secreto de cliente de Google Cloud (`GOCSPX-...`)   |
| **Facebook** | ID de aplicación de Meta (App ID)                                     | Clave secreta de la aplicación (App Secret) de Meta |

Sin estos valores, el botón “Continuar con Gmail/Facebook” no puede completar el login. Una vez puestos y guardados en Supabase, los botones deberían llevar a la pantalla de Google/Facebook y, al aceptar, volver a tu app ya logueado.
