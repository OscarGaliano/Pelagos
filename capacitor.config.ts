import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor para generar builds iOS (App Store) y Android (Play Store).
 * Tras npm run build, ejecuta: npx cap sync
 * Luego: npx cap open ios  o  npx cap open android
 */
const config: CapacitorConfig = {
  appId: 'com.pelagos.app',
  appName: 'Pelagos',
  webDir: 'dist',
  server: {
    // En producción las rutas deben funcionar en SPA (evitar 404 al recargar)
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
