import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifecanvas.app',
  appName: 'LifeCanvas',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    // 替换为您的 Vercel 线上地址
    url: 'https://lifebuddy-eosin.vercel.app', 
    cleartext: true
  }
};

export default config;
