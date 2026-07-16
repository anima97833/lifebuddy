import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifecanvas.app',
  appName: 'LifeCanvas',
  webDir: 'www',
  server: {
    // 替换为您的 Vercel 线上地址
    url: 'https://lifebuddy-eosin.vercel.app', 
    cleartext: true,
    allowNavigation: [
      "lifebuddy-eosin.vercel.app",
      "*.vercel.app"
    ]
  }
};

export default config;
