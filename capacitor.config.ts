import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifecanvas.app',
  appName: 'LifeCanvas',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    // 替换为您的 Vercel 线上地址
    url: 'https://lifebuddy-demo.vercel.app', // 如果有你自己的自定义域名或具体的 vercel 分配域名，可以在这改
    cleartext: true
  }
};

export default config;
