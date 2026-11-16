import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Link as LinkIcon,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
} from "lucide-react";
import type { FeatureProps } from "../types";
import { FeatureFrame } from "../shared";
import { analyzeLink, type LinkAnalysis } from "./analyze";
import { decodeQr, imagePixels, linksFromText } from "./media";
import type { Worker } from "tesseract.js";
import {
  checkOnline,
  prepareOnlineAddress,
  threatDescriptions,
  type OnlineResult,
} from "./online";
import { intlLocale } from "../../i18n/core";
type OnlineState =
  | { kind: "checking" }
  | { kind: "done"; data: OnlineResult }
  | { kind: "error"; message: string };
export default function LinkCheckPage({ onNavigate }: FeatureProps) {
  const [input, setInput] = useState(""),
    [result, setResult] = useState<LinkAnalysis | null>(null),
    [error, setError] = useState("");
  const [online, setOnline] = useState<OnlineState | null>(null);
  const onlineRequest = useRef<AbortController | null>(null),
    onlineGeneration = useRef(0),
    onlineHeading = useRef<HTMLHeadingElement>(null);
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
  function cancelOnline() {
    onlineGeneration.current++;
    onlineRequest.current?.abort();
    onlineRequest.current = null;
  }
  function stopResources() {
    cancelOnline();
    generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    void worker.current?.terminate();
    worker.current = null;
  }
  useEffect(() => {
    const suspend = () => {
      stopResources();
      setCamera(false);
      setBusy(false);
      setOnline(null);
      setResult(null);
    };
    const hide = () => {
      if (document.hidden) suspend();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("cybershield:native-pause", suspend);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("cybershield:native-pause", suspend);
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
  useEffect(() => {
    if (!online || online.kind === "checking") return;
    onlineHeading.current?.focus({ preventScroll: true });
    onlineHeading.current
      ?.closest("section")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
    if (online.kind !== "done") return;
    const remaining =
      Date.parse(online.data.checkedAt) + 25 * 60 * 1000 - Date.now();
    const timeout = setTimeout(
      () => {
        setOnline({
          kind: "error",
          message:
            "Результат устарел. Повторите проверку, чтобы получить актуальные сведения.",
        });
      },
      Math.max(0, remaining),
    );
    return () => clearTimeout(timeout);
  }, [online]);
  function clear() {
    stopResources();
    setInput("");
    setResult(null);
    setOnline(null);
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
    cancelOnline();
    setOnline(null);
    setError("");
    setResult(null);
    try {
      setResult(analyzeLink(value));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function inspectOnline() {
    stopResources();
    setCamera(false);
    setBusy(false);
    setError("");
    setResult(null);
    setOnline(null);
    let local: LinkAnalysis;
    try {
      local = analyzeLink(input);
      prepareOnlineAddress(input);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setResult(local);
    setOnline({ kind: "checking" });
    const request = ++onlineGeneration.current;
    const controller = new AbortController();
    onlineRequest.current = controller;
    try {
      const data = await checkOnline(input, controller.signal);
      if (request === onlineGeneration.current)
        setOnline({ kind: "done", data });
    } catch (e) {
      if (request === onlineGeneration.current)
        setOnline({ kind: "error", message: (e as Error).message });
    } finally {
      if (request === onlineGeneration.current) onlineRequest.current = null;
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
    cancelOnline();
    setOnline(null);
    setResult(null);
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
      description="Проверяем ссылки по базе угроз Google Safe Browsing. QR-коды и текст изображений распознаются на устройстве."
      onNavigate={onNavigate}
    >
      <aside className="privacy-notice">
        <div>
          <h2>Проверка по базе известных угроз</h2>
          <p>
            Вставьте адрес или прочитайте QR-код, затем нажмите «Проверить
            онлайн». Полный адрес будет передан серверу CyberShield в Cloudflare
            и Google Safe Browsing. Изображение и распознанный текст остаются на
            устройстве.
          </p>
          <p>
            Возможны ошибочные предупреждения и пропуск опасных сайтов. Проверка
            не гарантирует безопасность покупки, платежа или ввода данных. Поле,
            изображение и результат не сохраняются в приложении.
          </p>
        </div>
      </aside>
      <form
        className="feature-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void inspectOnline();
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
            cancelOnline();
            setOnline(null);
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
          Нажимая «Проверить онлайн», вы соглашаетесь передать полный адрес
          Cloudflare и Google для проверки. Не отправляйте ссылки с личными
          кодами или токенами. «Разобрать адрес» работает без отправки данных.
        </p>
        <div className="feature-actions">
          <button
            className="primary"
            type="submit"
            disabled={busy || online?.kind === "checking"}
          >
            <ShieldCheck size={22} />
            Проверить онлайн
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => inspect()}
            disabled={busy}
          >
            <LinkIcon size={22} />
            Разобрать адрес
          </button>
          <button className="secondary" type="button" onClick={clear}>
            <Trash2 size={22} />
            Очистить
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {online && (
        <section
          data-testid="link-online-result"
          className={`link-online-result ${online.kind === "done" ? `link-online-${online.data.verdict}` : `link-online-${online.kind}`}`}
          aria-label="Результат онлайн-проверки"
          aria-busy={online.kind === "checking"}
        >
          <div className="analysis-summary">
            {online.kind === "done" &&
            online.data.verdict === "no_known_threats" ? (
              <ShieldCheck size={32} />
            ) : (
              <ShieldAlert size={32} />
            )}
            <h2 ref={onlineHeading} tabIndex={-1}>
              {online.kind === "checking"
                ? "Проверяем ссылку по базе угроз…"
                : online.kind === "error"
                  ? "Не удалось завершить проверку"
                  : online.data.verdict === "dangerous"
                    ? "Ссылка может быть опасной"
                    : "Угроз не обнаружено"}
            </h2>
            {online.kind === "checking" && (
              <p role="status">
                Ожидаем ответ Google Safe Browsing. Проверяемый сайт в вашем
                браузере не открывается.
              </p>
            )}
            {online.kind === "error" && (
              <>
                <p role="alert">{online.message}</p>
                <p>
                  Результат не получен. Это не означает, что ссылка безопасна
                  или опасна.
                </p>
                <button
                  className="primary"
                  type="button"
                  onClick={() => void inspectOnline()}
                >
                  Повторить онлайн-проверку
                </button>
              </>
            )}
            {online.kind === "done" && (
              <>
                <p>
                  {online.data.verdict === "dangerous"
                    ? "Google Safe Browsing пометил этот адрес как потенциально опасный. Не вводите данные, не платите и не загружайте файлы по этой ссылке."
                    : "На момент проверки Google Safe Browsing не обнаружил этот адрес в своих списках угроз. Это не гарантия безопасности сайта или предложения."}
                </p>
                {online.data.threatTypes.length > 0 && (
                  <ul>
                    {online.data.threatTypes.map((type) => (
                      <li key={type}>{threatDescriptions[type]}</li>
                    ))}
                  </ul>
                )}
                <p className="link-check-time">
                  Проверено:{" "}
                  <time dateTime={online.data.checkedAt} data-i18n="off">
                    {new Date(online.data.checkedAt).toLocaleString(
                      intlLocale(),
                      {
                        dateStyle: "short",
                        timeStyle: "short",
                      },
                    )}
                  </time>
                </p>
              </>
            )}
          </div>
          {online.kind === "done" && (
            <div className="feature-panel link-check-scope">
              <p>
                <b>Проверенный домен: </b>
                <span data-i18n="off">
                  {result?.domain ?? result?.hostname}
                </span>
              </p>
              <p>
                Проверен переданный адрес. Перенаправления и содержимое страницы
                не проверялись.
              </p>
              {result?.signals.some((signal) => signal.id === "shortener") && (
                <p className="link-shortener-note">
                  <b>Сокращённая ссылка скрывает конечный адрес.</b> Результат
                  относится к сокращателю; сайт назначения ещё не проверен.
                </p>
              )}
              <p>
                <a
                  href="https://developers.google.com/safe-browsing/v4/advisory"
                  target="_blank"
                  rel="noreferrer"
                >
                  Рекомендации, предоставленные Google
                </a>
              </p>
              <p>
                Возможны ложные срабатывания и пропуск новых угроз. Подлинность
                магазина и надёжность продавца эта проверка не устанавливает.
              </p>
            </div>
          )}
        </section>
      )}
      <section className="feature-panel">
        <h2>Прочитать QR или скриншот</h2>
        <label className="link-upload">
          <ImagePlus size={23} />
          <span>Выбрать изображение: PNG, JPEG или WebP, до 10 МБ</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || online?.kind === "checking"}
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
              disabled={busy || online?.kind === "checking"}
            >
              Найти ссылку в тексте изображения
            </button>
          )}
          {(busy || camera) && (
            <button
              className="secondary"
              onClick={() => {
                stopResources();
                setOnline(null);
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
                  cancelOnline();
                  setOnline(null);
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
      {result && (
        <section
          className={`analysis-result ${online ? "link-local-secondary" : `analysis-${result.level}`}`}
          aria-label="Результат проверки адреса"
        >
          <details open={!online} className="link-local-details">
            <summary>Разбор адреса на устройстве</summary>
            {!online && (
              <div
                className={`analysis-summary ${result.level === "unknown" ? "link-local-neutral" : ""}`}
              >
                <ShieldAlert size={32} />
                <h2 ref={heading} tabIndex={-1}>
                  {result.level === "high"
                    ? "Обнаружены опасные признаки в адресе"
                    : result.level === "attention"
                      ? "Адрес требует дополнительной проверки"
                      : "Адрес разобран на устройстве"}
                </h2>
                <p>
                  Это разбор написания адреса без обращения к базам угроз. Для
                  онлайн-проверки используйте кнопку «Проверить онлайн».
                </p>
              </div>
            )}
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
                официальный адрес. Свяжитесь с организацией через известный
                канал. Если уже передали данные или деньги, перейдите в раздел
                помощи.
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
          </details>
        </section>
      )}
    </FeatureFrame>
  );
}
