import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esdesign.petkeeper',
  appName: 'PetKeeper',
  webDir: 'www',
  server: {
    // Loads the live published site inside the Android WebView.
    // Change this to your custom domain once you connect one in Lovable.
    url: 'https://petkeeper-gold-care.lovable.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;