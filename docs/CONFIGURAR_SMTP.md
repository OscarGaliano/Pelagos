# Configuración SMTP en Supabase

Guía para configurar un servidor SMTP propio en Supabase y que se envíen los correos de confirmación y recuperación de contraseña a cualquier usuario.

---

## Dónde configurarlo en Supabase

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) y abre tu proyecto.
2. En el menú izquierdo: **Project Settings** (icono de engranaje).
3. Pestaña **Authentication**.
4. Baja hasta la sección **SMTP Settings**.
5. Activa **Enable Custom SMTP**.
6. Rellena los campos según el proveedor que uses (abajo) y guarda.

---

## Opción 1: Resend (recomendado, cuenta gratuita)

[Resend](https://resend.com) permite enviar miles de correos al mes gratis y se integra muy bien con Supabase.

### Paso 1: Cuenta y API Key en Resend

1. Regístrate en [resend.com](https://resend.com).
2. Ve a **API Keys** ([resend.com/api-keys](https://resend.com/api-keys)).
3. Crea una API Key (nombre ej. `Supabase Auth`) y **cópiala** (solo se muestra una vez).

### Paso 2: Dominio (opcional para empezar)

- **Para pruebas:** Resend permite enviar desde `onboarding@resend.dev` a tu propio email sin verificar dominio. Puedes usar ese remitente al configurar Supabase.
- **Para producción:** En Resend → **Domains** añade y verifica tu dominio (ej. `tudominio.com`) y usa como remitente `noreply@tudominio.com` o similar.

### Paso 3: Valores en Supabase (SMTP Settings)

En **Project Settings** → **Authentication** → **SMTP Settings**, usa exactamente:

| Campo            | Valor                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Sender email** | `onboarding@resend.dev` (pruebas) o `noreply@tudominio.com` (con dominio verificado) |
| **Sender name**  | `Pelagos` (o el nombre de tu app)                                                    |
| **Host**         | `smtp.resend.com`                                                                    |
| **Port**         | `465`                                                                                |
| **Username**     | `resend`                                                                             |
| **Password**     | Tu API Key de Resend (la que copiaste)                                               |

Guarda los cambios. A partir de ahí, Supabase enviará los correos de Auth (confirmación, recuperar contraseña) a través de Resend.

---

## Opción 2: Brevo (antes Sendinblue)

1. Cuenta en [brevo.com](https://www.brevo.com).
2. **SMTP & API** → **SMTP**: anota servidor, puerto, login y contraseña SMTP.
3. En Supabase (misma sección SMTP Settings):

| Campo            | Dónde está en Brevo                                                     |
| ---------------- | ----------------------------------------------------------------------- |
| **Sender email** | Email verificado en Brevo (ej. `noreply@tudominio.com`)                 |
| **Sender name**  | Nombre que quieras (ej. `Pelagos`)                                      |
| **Host**         | Ej. `smtp-relay.brevo.com` (lo indica Brevo en SMTP)                    |
| **Port**         | Normalmente `587`                                                       |
| **Username**     | Tu email de login Brevo o el usuario SMTP que te den                    |
| **Password**     | Contraseña SMTP (no la de tu cuenta; en Brevo suele ser una “SMTP key”) |

---

## Opción 3: SendGrid

1. Cuenta en [sendgrid.com](https://sendgrid.com).
2. **Settings** → **Sender Authentication**: verifica un dominio o un único remitente.
3. **Settings** → **API Keys**: crea una API Key con permiso “Mail Send”.
4. En Supabase:

| Campo        | Valor                                       |
| ------------ | ------------------------------------------- |
| **Host**     | `smtp.sendgrid.net`                         |
| **Port**     | `587`                                       |
| **Username** | `apikey` (literalmente la palabra "apikey") |
| **Password** | Tu API Key de SendGrid                      |

Sender email y name: un remitente verificado en SendGrid.

---

## Comprobar que funciona

1. En Supabase: **Authentication** → **Providers** → **Email** → **Confirm email** activado.
2. En tu app, regístrate con un email que **no** sea de tu equipo de Supabase.
3. Revisa la bandeja de entrada (y spam). Deberías recibir el correo de confirmación.
4. Si usas `onboarding@resend.dev`, ten en cuenta que algunos proveedores pueden marcar el correo como spam; para producción es mejor usar tu propio dominio verificado.

---

## Resumen rápido (Resend)

```
Supabase → Project Settings → Authentication → SMTP Settings

Enable Custom SMTP: ON
Sender email: onboarding@resend.dev  (o noreply@tudominio.com)
Sender name: Pelagos
Host: smtp.resend.com
Port: 465
Username: resend
Password: [tu API Key de Resend]
→ Save
```

Después de guardar, los correos de confirmación y “olvidé contraseña” se enviarán por Resend a cualquier dirección.
