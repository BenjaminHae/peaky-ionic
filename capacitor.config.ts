import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.benjaminh.peaky',
  appName: 'peaky',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  }
};

export default config;
