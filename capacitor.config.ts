import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "by.cybershield.app",
  appName: "CyberShield",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    minWebViewVersion: 123,
    backgroundColor: "#0d1b16",
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: "https",
    cleartext: false,
    errorPath: "android-webview-error.html",
  },
  plugins: {
    CapacitorHttp: { enabled: false },
    SystemBars: {
      // MainActivity owns native padding on all WebView versions. SystemBars
      // still controls icon contrast, without installing a competing listener.
      insetsHandling: "disable",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
