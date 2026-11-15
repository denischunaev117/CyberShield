import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
export default function LessonQr({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (canvas.current)
      QRCode.toCanvas(canvas.current, url, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" },
      }).catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [url]);
  return (
    <div className="lesson-qr">
      {!error && (
        <canvas
          ref={canvas}
          aria-label="QR-код публичной ссылки на занятие"
          role="img"
          data-url={url}
        />
      )}
      <div>
        <b>Открыть занятие без регистрации</b>
        <p>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </p>
        <p>
          QR содержит только адрес занятия. Он не регистрирует участие и не
          передаёт имя, оценки или токены. Для открытия ссылки нужен интернет.
        </p>
        {error && (
          <p role="status">QR недоступен. Используйте текстовую ссылку.</p>
        )}
      </div>
    </div>
  );
}
