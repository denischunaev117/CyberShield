import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { translateText } from "../i18n/core";

export const isNativeApp = () => Capacitor.isNativePlatform();

const Print = registerPlugin<{
  print(options: { jobName: string }): Promise<void>;
}>("CyberShieldPrint");

const Files = registerPlugin<{
  save(options: {
    name: string;
    type: string;
    data: string;
    prompt: string;
  }): Promise<{ saved: boolean }>;
}>("CyberShieldFiles");

/** Native signals supplement document visibility, which varies between WebViews. */
export async function initializeNativeApp(): Promise<() => Promise<void>> {
  if (!isNativeApp()) return async () => {};
  const handles = await Promise.all([
    App.addListener("backButton", async () => {
      const event = new CustomEvent("cybershield:native-back", {
        cancelable: true,
      });
      window.dispatchEvent(event);
      if (!event.defaultPrevented) await App.exitApp();
    }),
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) return;
      document
        .querySelectorAll<HTMLMediaElement>("audio, video")
        .forEach((media) => {
          media.pause();
        });
      window.dispatchEvent(new Event("cybershield:native-pause"));
    }),
  ]);
  return async () => {
    await Promise.all(handles.map((handle) => handle.remove()));
  };
}

const exportTypes: Record<string, string> = {
  "cybershield-plan.json": "application/json",
  "cybershield-diagnostic.json": "application/json",
  "cybershield-lesson.json": "application/json",
  "cybershield-group.csv": "text/csv;charset=utf-8",
};

/** Android's document picker provides local/cloud Save As without storage permission. */
export async function nativeExportFile(
  name: string,
  type: string,
  data: string,
) {
  if (
    !isNativeApp() ||
    exportTypes[name] !== type ||
    new TextEncoder().encode(data).byteLength > 2 * 1024 * 1024
  )
    throw new Error("Unsupported native export");
  await Files.save({
    name,
    type,
    data,
    prompt: translateText("Сохранить или отправить файл"),
  });
  // A cancelled picker resolves saved:false; no success claim or error alert is shown.
}

export async function nativePrint(): Promise<void> {
  try {
    await Print.print({ jobName: translateText("КиберЩит") });
  } finally {
    // Also fires after cancellation/failure, like the web afterprint lifecycle.
    window.dispatchEvent(new Event("afterprint"));
  }
}

export function nativeExportFailure() {
  window.alert(
    translateText(
      "Не удалось открыть меню сохранения файла. Попробуйте ещё раз.",
    ),
  );
}

export function nativePrintFailure() {
  window.alert(translateText("Не удалось открыть печать. Попробуйте ещё раз."));
}
