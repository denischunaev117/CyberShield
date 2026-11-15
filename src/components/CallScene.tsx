import { localizedAudio } from "../i18n/audio";
import { publicAsset } from "../platform/assets";
import { EvidenceCard } from "./EvidenceCard";
import { useEffect, useRef, useState } from "react";
import { Phone, ShieldCheck, Volume2, Play, Pause } from "lucide-react";
import type { Scenario, Scene, Step } from "../engine";
export function CallScene({
  scenario,
  scene,
  steps,
}: {
  scenario: Scenario;
  scene: Scene;
  steps: Step[];
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const audioPath = scene.audio ? localizedAudio(scene.audio) : undefined;
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = audio.current;
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") element?.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      element?.pause();
    };
  }, []);
  useEffect(() => {
    setPlaying(false);
    setFailed(false);
    audio.current?.pause();
    audio.current?.load();
  }, [audioPath]);
  return (
    <div className="call-scene" aria-live="polite">
      <div className="call-identity">
        <span className="call-avatar">
          <Phone size={38} />
        </span>
        <h3>
          {scene.speaker === "narrator"
            ? "После вашего решения"
            : scenario.sender}
        </h3>
        <span>
          {scene.speaker === "narrator"
            ? "Событие после вашего решения"
            : "Учебный телефонный разговор"}
        </span>
      </div>
      {scene.audio && (
        <div className="voice-player">
          <div className={`voice-label ${playing ? "is-playing" : ""}`}>
            <Volume2 size={20} />
            {playing ? "Собеседник говорит" : "Реплика собеседника"}
            <span>ElevenLabs</span>
          </div>
          <button
            className="voice-toggle"
            disabled={failed}
            onClick={async () => {
              const element = audio.current;
              if (!element) return;
              if (element.paused) {
                try {
                  await element.play();
                } catch {
                  setFailed(true);
                }
              } else element.pause();
            }}
          >
            {playing ? <Pause size={22} /> : <Play size={22} />}{" "}
            {playing ? "Пауза" : "Слушать реплику"}
          </button>
          <audio
            ref={audio}
            controls
            preload="metadata"
            src={publicAsset(audioPath!)}
            aria-label="Озвучка реплики"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => setFailed(true)}
          />
          {failed && (
            <p role="status">
              Аудио недоступно. Можно продолжить по тексту ниже.
            </p>
          )}
        </div>
      )}
      <div className="call-subtitles">
        <span>
          {scene.speaker === "narrator" ? "Что произошло" : "Текст реплики"}
        </span>
        <p>{scene.message}</p>
      </div>
      {scene.evidence && <EvidenceCard evidence={scene.evidence} />}
      <p className="call-hint">
        <ShieldCheck size={18} />
        {scene.audio
          ? "Нажмите воспроизведение, когда будете готовы. Ответить можно и без звука."
          : "Это учебное событие после вашего решения. Выберите дальнейшее действие."}
      </p>
      {steps.length > 0 && (
        <details className="call-history">
          <summary>Предыдущие решения ({steps.length})</summary>
          {steps.map((step, i) => (
            <div key={i}>
              <p>{scenario.nodes[step.node].message}</p>
              <b>Вы: {step.choice.text}</b>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
