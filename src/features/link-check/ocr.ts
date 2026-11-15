import { createWorker, OEM, type Worker } from "tesseract.js";
import { publicAsset } from "../../platform/assets";
export async function createLocalOcr(
  onProgress: (value: number) => void,
): Promise<Worker> {
  return createWorker(["rus", "eng", "bel"], OEM.LSTM_ONLY, {
    workerPath: publicAsset("ocr/worker.min.js"),
    corePath: publicAsset("ocr/core/tesseract-core-lstm.wasm.js"),
    langPath: publicAsset("ocr/lang"),
    workerBlobURL: false,
    cacheMethod: "none",
    gzip: true,
    logger: (m) => {
      if (m.status === "recognizing text")
        onProgress(Math.round(m.progress * 100));
    },
  });
}
