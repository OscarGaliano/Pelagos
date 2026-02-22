# Preparación para App Store (iOS) y Google Play (Android)

Este documento deja todo listo para publicar Pelagos como app nativa usando **Capacitor** (empaqueta la web actual en iOS y Android).

---

## 1. Requisitos en tu máquina

- **Node.js** 18+ (ya lo usas para el proyecto)
- **Xcode** (solo macOS) para compilar y subir a App Store
- **Android Studio** para compilar y firmar para Play Store
- **Cuentas**:
  - [Apple Developer](https://developer.apple.com) (99 USD/año) para App Store
  - [Google Play Console](https://play.google.com/console) (pago único) para Android

---

## 2. Iconos y splash (obligatorio para las tiendas)

Las tiendas piden varios tamaños. Usa tu **logo.png** como base y genera:

**iOS (Xcode / App Store):**
- 1024×1024 (App Store)
- 20, 29, 40, 60, 76, 83.5 (pt) para iconos en dispositivo

**Android:**
- 48, 72, 96, 144, 192 dp (mdpi a xxxhdpi); 512×512 para Play Store

Puedes usar [app-icon.co](https://app-icon.co) o [easyappicon.com](https://easyappicon.com) subiendo `public/logo.png`.  
Opcional: en el proyecto ya hay `public/logo.png`; para PWA/Manifest está referenciado; para nativo conviene generar la carpeta de iconos con las herramientas de Capacitor o las anteriores.

---

## 3. Añadir plataformas iOS y Android (Capacitor)

Una sola vez en el proyecto:

```bash
cd "Premium Spearfishing App UI"
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

- **appId** en `capacitor.config.ts` es `com.pelagos.app`. Cámbialo si quieres (ej. `com.tudominio.pelagos`); debe ser único.
- **appName** es el que verá el usuario bajo el icono («Pelagos»).

---

## 4. Flujo de trabajo para generar builds

Cada vez que quieras actualizar la app nativa con los últimos cambios de la web:

```bash
npm run build
npx cap sync
```

- **iOS:** `npx cap open ios` → se abre Xcode. Archiva y sube a App Store Connect.
- **Android:** `npx cap open android` → se abre Android Studio. Genera AAB y sube a Play Console.

Scripts en `package.json`:
- `npm run cap:sync` → build + cap sync
- `npm run cap:ios` → sync + open iOS
- `npm run cap:android` → sync + open Android

---

## 5. Versión y build number (importante para las tiendas)

- **package.json** → `version` (ej. `1.0.0`). Úsala como “versión que ve el usuario”.
- **iOS:** En Xcode, **Current Project Version** (build number) debe subir en cada envío (ej. 1, 2, 3…).
- **Android:** En `android/app/build.gradle`, `versionCode` (entero) debe aumentar en cada envío; `versionName` puede ser la misma que `version` de package.json.

Antes de cada envío, incrementa versión o build según corresponda.

---

## 6. Checklist App Store (Apple)

- [ ] Cuenta Apple Developer activa
- [ ] En Xcode: equipo de desarrollo y signing correctos
- [ ] Icono 1024×1024 y todos los tamaños requeridos
- [ ] Splash / Launch Screen (opcional pero recomendado)
- [ ] **URL de Política de Privacidad** (obligatoria) → añadir en App Store Connect
- [ ] Descripción, capturas, categoría (Deportes / Estilo de vida)
- [ ] Si usas ubicación o cámara: justificar en Info.plist y en la ficha de la app

---

## 7. Checklist Google Play (Android)

- [ ] Cuenta Google Play Console
- [ ] Icono 512×512 para la ficha de la tienda
- [ ] **URL de Política de Privacidad** (obligatoria)
- [ ] Contenido: descripción, capturas, categoría
- [ ] Firmar la app: keystore de release (guardar backup y contraseñas)
- [ ] En cada envío: `versionCode` mayor que el anterior

---

## 8. Política de privacidad

Ambas tiendas exigen un enlace a una política de privacidad. Debe estar publicada en una URL pública (tu web o GitHub Pages) y explicar:

- Qué datos recoges (cuenta, email, ubicación si la usas, etc.)
- Uso de Supabase (auth, base de datos)
- Si usas analytics o terceros
- Derechos del usuario (acceso, borrado, etc.)

Añade esa URL en App Store Connect y en Play Console donde piden “Privacy Policy”.

---

## 9. URLs y entornos

- En producción, configura **Supabase** con las URLs correctas (dominio de tu app o `capacitor://localhost` si aplica).
- En **Auth → URL Configuration** de Supabase, incluye las URLs de redirect que use la app (web y, si aplica, esquema custom para deep links).

---

## 10. Resumen rápido

| Paso | Comando / acción |
|------|-------------------|
| Instalar Capacitor | `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android` |
| Añadir plataformas | `npx cap add ios` y `npx cap add android` |
| Build web | `npm run build` |
| Sincronizar a nativo | `npx cap sync` |
| Abrir en Xcode | `npx cap open ios` |
| Abrir en Android Studio | `npx cap open android` |
| Subir a tiendas | Desde Xcode (App Store Connect) y desde Android Studio (Play Console) |

Con esto el proyecto queda preparado para lanzamiento en App Store y Android; solo falta ejecutar los comandos, rellenar iconos/splash, política de privacidad y datos de las fichas en cada tienda.
