import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Link as LinkIcon,
  ShieldAlert,
  Square,
  Trash2,
} from "lucide-react";
import type { FeatureProps } from "../types";
import { FeatureFrame } from "../shared";
import { analyzeLink, type LinkAnalysis } from "./analyze";
import { decodeQr, imagePixels, linksFromText } from "./media";
import type { Worker } from "tesseract.js";
export default function LinkCheckPage({ onNavigate }: FeatureProps) {
  const [input, setInput] = useState(""),
    [result, setResult] = useState<LinkAnalysis | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false),
    [progress, setProgress] = useState(0);
  const [image, setImage] = useState<File | null>(null),
    [candidates, setCandidates] = useState<string[]>([]),
    [notice, setNotice] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    frame = useRef<number>(0),
    generation = useRef(0),
    worker = useRef<Worker | null>(null);
  const heading = useRef<HTMLHeadingElement>(null),
    fileInput = useRef<HTMLInputElement>(null);
  function stopResources() {
    generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    void worker.current?.terminate();
    worker.current = null;
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stopResources();
        setCamera(false);
        setBusy(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stopResources();
    };
  }, []);
  useEffect(() => {
    if (result) {
      heading.current?.focus({ preventScroll: true });
      heading.current
        ?.closest("section")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [result]);
  function clear() {
    stopResources();
    setInput("");
    setResult(null);
    setError("");
    setCamera(false);
    setBusy(false);
    setImage(null);
    setCandidates([]);
    setNotice("");
    setProgress(0);
    if (fileInput.current) fileInput.current.value = "";
  }
  function inspect(value = input) {
    setError("");
    setResult(null);
    try {
      setResult(analyzeLink(value));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function readImage(file: File | undefined) {
    if (!file) return;
    clear();
    setImage(file);
    setBusy(true);
    const request = ++generation.current;
    try {
      const pixels = await imagePixels(file);
      if (request !== generation.current) return;
      const data = decodeQr(pixels);
      if (data) {
        setInput(data.slice(0, 4096));
        setNotice(
          "QR-код прочитан. Его содержимое не открывалось. Проверьте адрес перед анализом.",
        );
        if (data.length > 4096)
          setError("Содержимое QR слишком длинное. Оно не выполнялось.");
      } else
        setNotice(
          "QR-код не найден. Если это скриншот сообщения, можно распознать ссылки в тексте на устройстве.",
        );
    } catch {
      if (request === generation.current)
        setError(
          "Не удалось прочитать изображение. Нужен PNG, JPEG или WebP до 10 МБ с чётким QR-кодом или текстом.",
        );
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  async function readText() {
    if (!image) return;
    setBusy(true);
    setError("");
    setCandidates([]);
    setProgress(0);
    const request = ++generation.current;
    try {
      const pixels = await imagePixels(image);
      if (request !== generation.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error("Canvas unavailable");
      ctx.putImageData(pixels, 0, 0);
      const { createLocalOcr } = await import("./ocr");
      if (request !== generation.current) return;
      const w = await createLocalOcr((v) => {
        if (request === generation.current) setProgress(v);
      });
      if (request !== generation.current) {
        await w.terminate();
        return;
      }
      worker.current = w;
      const { data } = await w.recognize(canvas);
      if (request !== generation.current) return;
      const found = linksFromText(data.text);
      setCandidates(found);
      setNotice(
        found.length
          ? "Выберите распознанный адрес и обязательно сверьте его с изображением: OCR может ошибаться в буквах."
          : "Ссылки не распознаны. Перепишите адрес вручную и сверьте каждый символ.",
      );
    } catch {
      if (request === generation.current)
        setError(
          "Не удалось распознать текст. Модули распознавания должны загрузиться с этого сайта; можно вставить адрес вручную.",
        );
    } finally {
      if (request === generation.current) {
        void worker.current?.terminate();
        worker.current = null;
        setBusy(false);
      }
    }
  }
  async function startCamera() {
    clear();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Камера недоступна. Откройте сайт по HTTPS или загрузите изображение.",
      );
      return;
    }
    const request = ++generation.current;
    setBusy(true);
    setCamera(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (request !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      if (!video.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      video.current.srcObject = media;
      await video.current.play();
      if (request !== generation.current) return;
      setBusy(false);
      const canvas = document.createElement("canvas"),
        ctx = canvas.getContext("2d", { willReadFrequently: true });
      let last = 0;
      const scan = (time: number) => {
        if (request !== generation.current) return;
        if (
          video.current &&
          ctx &&
          video.current.readyState >= 2 &&
          time - last > 250
        ) {
          last = time;
          const v = video.current,
            scale = Math.min(1, 1200 / Math.max(v.videoWidth, v.videoHeight));
          canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const data = decodeQr(
            ctx.getImageData(0, 0, canvas.width, canvas.height),
          );
          if (data) {
            stopResources();
            setCamera(false);
            setInput(data.slice(0, 4096));
            setNotice(
              "QR-код прочитан, камера выключена. Адрес не открывался.",
            );
            if (data.length > 4096)
              setError("Содержимое QR слишком длинное. Оно не выполнялось.");
            return;
          }
        }
        frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch {
      if (request === generation.current) {
        stopResources();
        setBusy(false);
        setCamera(false);
        setError(
          "Не удалось включить камеру. Проверьте разрешение браузера или загрузите изображение.",
        );
      }
    }
  }
  return (
    <FeatureFrame
      title="Проверить ссылку или QR-код"
      description="Разбираем адрес на устройстве. Не открываем сайты, не отправляем изображения и не выполняем содержимое QR-кода."
      onNavigate={onNavigate}
    >
      <aside className="privacy-notice">
        <div>
          <h2>Сначала проверьте адрес</h2>
          <p>
            Не переходите по подозрительной ссылке ради проверки. Не загружайте
            скриншоты с чужими сообщениями, реквизитами или кодами. Поле и
            изображение не сохраняются; очистка или выход удаляют их из раздела.
          </p>
          <p>
            Без открытия сайта нельзя узнать реальную цепочку перенаправлений,
            содержимое страницы и конечный адрес сокращателя. Даже HTTPS и
            отсутствие признаков не гарантируют безопасность.
          </p>
        </div>
      </aside>
      <form
        className="feature-panel"
        onSubmit={(e) => {
          e.preventDefault();
          inspect();
        }}
      >
        <label htmlFor="link-input">
          <b>Ссылка для проверки</b>
        </label>
        <textarea
          id="link-input"
          value={input}
          maxLength={4096}
          rows={3}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
            setError("");
          }}
          placeholder="https://example.invalid/"
          aria-describedby="link-privacy"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <p id="link-privacy">
          Ссылка останется на устройстве. Пароли, личные токены и содержимое QR
          не публикуются.
        </p>
        <div className="feature-actions">
          <button className="primary" type="submit" disabled={busy}>
            <LinkIcon size={22} />
            Разобрать адрес
          </button>
          <button className="secondary" type="button" onClick={clear}>
            <Trash2 size={22} />
            Очистить
          </button>
        </div>
      </form>
      <section className="feature-panel">
        <h2>Прочитать QR или скриншот</h2>
        <label className="link-upload">
          <ImagePlus size={23} />
          <span>Выбрать изображение: PNG, JPEG или WebP, до 10 МБ</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => void readImage(e.target.files?.[0])}
          />
        </label>
        <div className="feature-actions">
          <button
            className="secondary"
            onClick={() => void startCamera()}
            disabled={busy || camera}
          >
            <Camera size={22} />
            Сканировать камерой
          </button>
          {image && (
            <button
              className="secondary"
              onClick={() => void readText()}
              disabled={busy}
            >
              Найти ссылку в тексте изображения
            </button>
          )}
          {(busy || camera) && (
            <button
              className="secondary"
              onClick={() => {
                stopResources();
                setBusy(false);
                setCamera(false);
                setNotice("Чтение остановлено. Камера выключена.");
              }}
            >
              <Square size={22} />
              Остановить
            </button>
          )}
        </div>
        {camera && (
          <video
            className="qr-camera"
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Предпросмотр камеры для QR"
          />
        )}
        {busy && (
          <p role="status">
            Обрабатываем на устройстве… {progress > 0 ? `${progress}%` : ""}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {candidates.length > 0 && (
          <div className="answer-options" data-i18n="off">
            {candidates.map((link) => (
              <button
                key={link}
                className="secondary raw-link"
                data-i18n="off"
                onClick={() => {
                  setInput(link);
                  setResult(null);
                  setError("");
                }}
              >
                {link}
              </button>
            ))}
          </div>
        )}
        <p>
          Камера запрашивается только по кнопке и выключается после чтения,
          остановки, ухода со страницы или скрытия вкладки. Для OCR загружаются
          локальные языковые модули сайта; изображение остаётся на устройстве.
        </p>
      </section>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {result && (
        <section
          className={`analysis-result analysis-${result.level}`}
          aria-label="Результат проверки адреса"
        >
          <div className="analysis-summary">
            <ShieldAlert size={32} />
            <h2 ref={heading} tabIndex={-1}>
              {result.level === "high"
                ? "Обнаружены опасные признаки в адресе"
                : result.level === "attention"
                  ? "Адрес требует дополнительной проверки"
                  : "Явные признаки не найдены — безопасность не подтверждена"}
            </h2>
            <p>
              Сайт не открывался. Не вводите данные и не платите только на
              основании этой проверки.
            </p>
          </div>
          <div className="feature-panel">
            <h3>Куда указывает адрес</h3>
            <dl className="url-details">
              <dt>Основной домен</dt>
              <dd data-i18n="off">{result.domain ?? result.hostname}</dd>
              <dt>Полное имя узла</dt>
              <dd data-i18n="off">{result.unicodeHostname}</dd>
              <dt>Техническая запись</dt>
              <dd data-i18n="off">{result.hostname}</dd>
              <dt>Протокол</dt>
              <dd>
                <span data-i18n="off">{result.protocol}</span>
                {result.inferredProtocol && (
                  <span> (протокол добавлен условно)</span>
                )}
              </dd>
            </dl>
            <p>
              Название банка в начале строки, пути или перед @ не меняет
              основной домен. Даже совпадение имени с известным адресом не
              проверяет страницу и её просьбы.
            </p>
          </div>
          <div className="reference-list">
            {result.signals.map((s) => (
              <article
                className={`feature-panel analysis-signal signal-${s.severity}`}
                key={s.id}
              >
                <span className="status-chip">
                  {s.severity === "high"
                    ? "Опасный признак"
                    : s.severity === "medium"
                      ? "Требует проверки"
                      : "Пояснение адреса"}
                </span>
                <h3>{s.title}</h3>
                {s.detail && <p>{s.detail}</p>}
                <p>{s.reason}</p>
                <p>
                  <b>Что сделать: </b>
                  {s.advice}
                </p>
              </article>
            ))}
          </div>
          {result.redirectHosts.length > 0 && (
            <div className="feature-panel">
              <h3>Другие домены внутри параметров</h3>
              <ul data-i18n="off">
                {result.redirectHosts.map((h) => (
                  <li key={h} data-i18n="off">
                    {h}
                  </li>
                ))}
              </ul>
              <p>
                Это содержимое параметров, а не проверенная цепочка переходов.
              </p>
            </div>
          )}
          <div className="feature-panel">
            <h3>Безопасный следующий шаг</h3>
            <p>
              Откройте знакомое приложение или самостоятельно найденный
              официальный адрес. Свяжитесь с организацией через известный канал.
              Если уже передали данные или деньги, перейдите в раздел помощи.
            </p>
            <button
              className="primary"
              onClick={() => {
                clear();
                onNavigate("emergency");
              }}
            >
              Мне нужна помощь
            </button>
          </div>
        </section>
      )}
    </FeatureFrame>
  );
}
