import { scenarios } from "../src/content/scenarios";
const voices: Record<string, string> = {
  "call-secret-operation": "JBFqnCBsd6RMkjVDRZzb",
  "call-relative-accident-real": "iP95p4xoKVk53GoZ742B",
  "call-import-compensation": "EXAVITQu4vr4xnSDxMaL",
  "call-protect-property": "onwK4e9ZLuTAKqWW03F9",
  "call-mirror-credit": "JBFqnCBsd6RMkjVDRZzb",
  "call-cash-inspection": "onwK4e9ZLuTAKqWW03F9",
  "call-tax-appointment-real": "EXAVITQu4vr4xnSDxMaL",
  "call-wonder-cure": "JBFqnCBsd6RMkjVDRZzb",
  "call-home-service-real": "EXAVITQu4vr4xnSDxMaL",
  "call-meter": "onwK4e9ZLuTAKqWW03F9",
  "call-pension": "JBFqnCBsd6RMkjVDRZzb",
  "call-clinic-real": "EXAVITQu4vr4xnSDxMaL",
  "call-bank": "JBFqnCBsd6RMkjVDRZzb",
  "call-mobile": "onwK4e9ZLuTAKqWW03F9",
  "call-parcel-real": "EXAVITQu4vr4xnSDxMaL",
  "call-family-real": "iP95p4xoKVk53GoZ742B",
};
process.stdout.write(
  JSON.stringify(
    scenarios.flatMap((s) =>
      Object.entries(s.nodes)
        .filter(([, n]) => n.audio)
        .map(([id, n]) => ({
          file: `${s.id}-${id}.mp3`,
          text: n.message,
          voice: voices[s.id],
          scenario: s.id,
          node: id,
        })),
    ),
  ),
);
