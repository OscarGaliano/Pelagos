# Solución al error 400 al iniciar sesión

Si al pulsar **Entrar** aparece un error **400 (Bad Request)** en la petición a Supabase (`/auth/v1/token?grant_type=password`), suele deberse a una de estas causas:

## 1. Confirmación de email activada (causa más frecuente)

Por defecto, Supabase puede tener activada la opción **Confirm email**. Hasta que el usuario no hace clic en el enlace que llega al correo, no puede iniciar sesión con email/contraseña y la API devuelve **400**.

**Qué hacer:**

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. Ve a **Authentication** → **Providers** → **Email**.
3. Desactiva **"Confirm email"** si quieres que los usuarios puedan entrar sin confirmar el correo (útil en desarrollo y en muchas apps).
4. Guarda los cambios.

Después de desactivarlo, los nuevos registros podrán iniciar sesión de inmediato. Los usuarios que ya se registraron pero no confirmaron seguirán sin poder entrar hasta que confirmen; si quieres, puedes marcar su email como confirmado manualmente en **Authentication** → **Users** (editar usuario → **Email Confirmed at**).

## 2. Email o contraseña incorrectos

Si el email no está registrado o la contraseña no coincide, Supabase también devuelve **400** (credenciales inválidas).

- Comprueba que el email sea exactamente el mismo con el que te registraste (mayúsculas/minúsculas, sin espacios).
- Si no recuerdas la contraseña, usa **¿Olvidaste tu contraseña?** en la pantalla de login.

## 3. Usuario creado a mano en el Dashboard

Si creaste el usuario en **Authentication** → **Users** → **Add user**, asegúrate de:

- Haber puesto bien la contraseña (mínimo 6 caracteres).
- Si "Confirm email" está activado, marcar el usuario como confirmado o usar el enlace que Supabase envía al email.

---

En la app ya se muestran mensajes más claros según el error (credenciales incorrectas, email no confirmado, etc.). Si tras revisar lo anterior sigues teniendo 400, revisa en el navegador la pestaña **Network** el cuerpo de la respuesta (Response) de esa petición; ahí suele venir el mensaje exacto que devuelve Supabase.
