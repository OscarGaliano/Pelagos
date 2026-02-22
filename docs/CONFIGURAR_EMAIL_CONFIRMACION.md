# Configurar envío de email de confirmación (Supabase)

Por defecto **Supabase no envía correos de confirmación** a usuarios que no son del equipo del proyecto. Para que los usuarios reciban el email al registrarse y puedan confirmar la cuenta, hay que configurar lo siguiente.

---

## 1. Activar "Confirm email" en Supabase

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) y abre tu proyecto.
2. Ve a **Authentication** → **Providers** → **Email**.
3. Activa **"Confirm email"**.
4. Guarda los cambios.

Así Supabase intentará enviar un correo de confirmación a cada nuevo registro.

---

## 2. Por qué no llega el correo (SMTP por defecto)

El SMTP que usa Supabase por defecto tiene esta limitación:

- **Solo envía a direcciones autorizadas**: las de los miembros del **equipo** del proyecto (Organization → Team).
- No envía a otros correos (Gmail, Outlook, etc.) a menos que configures un **SMTP propio**.

Por eso, aunque "Confirm email" esté activado, el usuario no recibe el mensaje si su email no está en el equipo.

Tienes dos caminos:

---

## Opción A: Pruebas rápidas (solo para desarrollo)

Para **probar** que el flujo funciona con tu propio correo:

1. En Supabase Dashboard, ve a tu **Organization** (icono de la organización arriba a la izquierda).
2. Entra en **Team** (o **Organization Settings** → **Team**).
3. Añade como miembro el **mismo email** con el que te registras en la app (o un correo de prueba).
4. Regístrate en la app con ese email: Supabase sí enviará el correo de confirmación a esa dirección.

Solo debes usar esta opción para pruebas; en producción conviene usar SMTP propio.

---

## Opción B: Configurar SMTP propio (recomendado para producción)

Para que **cualquier usuario** reciba el email de confirmación (y el de “olvidé contraseña”, etc.):

1. En Supabase Dashboard: **Project Settings** (icono engranaje) → pestaña **Authentication**.
2. Baja hasta la sección **SMTP Settings**.
3. Activa **"Enable Custom SMTP"**.
4. Rellena los datos de tu proveedor de correo:
   - **Sender email**: por ejemplo `noreply@tudominio.com` (o el que te asigne el proveedor).
   - **Sender name**: por ejemplo `Pelagos` o el nombre de tu app.
   - **Host**: el servidor SMTP (ej. `smtp.resend.com`, `smtp.sendgrid.net`, etc.).
   - **Port**: normalmente `587` (TLS) o `465` (SSL).
   - **Username** y **Password**: los que te da el proveedor (a veces es un API key como usuario).

Proveedores que suelen usarse con Supabase:

- [Resend](https://resend.com) – cuenta gratuita, fácil de configurar.
- [Brevo](https://www.brevo.com) (antes Sendinblue).
- [SendGrid](https://sendgrid.com).
- [Postmark](https://postmarkapp.com).

5. Guarda la configuración.

A partir de ahí, Supabase usará tu SMTP para **todos** los correos de Auth (confirmación, recuperar contraseña, etc.) y los usuarios sí recibirán el mensaje de confirmación.

---

## 3. URL de redirección tras confirmar

Cuando el usuario hace clic en el enlace del correo, Supabase le redirige a tu app. Para que eso funcione:

1. En Supabase: **Authentication** → **URL Configuration**.
2. En **Redirect URLs** añade exactamente la URL donde corre tu app, por ejemplo:
   - Desarrollo: `http://127.0.0.1:5176/auth/callback` (o el puerto que uses).
   - Producción: `https://tudominio.com/auth/callback`.
3. **Site URL** puede ser la URL base de tu app (ej. `http://127.0.0.1:5176` o `https://tudominio.com`).

En la app ya está configurado que, al registrarse, se use `emailRedirectTo: tu-origen/auth/callback`, así que con tener esa URL en **Redirect URLs** es suficiente.

---

## Resumen

| Objetivo                        | Qué hacer                                                            |
| ------------------------------- | -------------------------------------------------------------------- |
| Activar envío de confirmación   | Authentication → Providers → Email → **Confirm email** = ON          |
| Que llegue el correo en pruebas | Añadir el email de prueba al **Team** de la organización             |
| Que llegue a cualquier usuario  | Configurar **Custom SMTP** en Project Settings → Authentication      |
| Que el enlace lleve a tu app    | Añadir `.../auth/callback` en **Redirect URLs** en URL Configuration |

Después de esto, al registrarse el usuario recibirá el email de confirmación y, al hacer clic en el enlace, volverá a tu app con la sesión iniciada.
