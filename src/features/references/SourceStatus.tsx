import { references } from "../../content/references";
export function SourceStatus({ ids }: { ids: string[] }) {
  return (
    <aside className="source-status">
      <b>Рекомендации требуют независимой проверки</b>
      <p>
        Редакция 1. Экспертное заключение не получено. Остановка общения сама по
        себе не отменяет уже возникшие последствия.
      </p>
      <ul>
        {ids.map((id) => {
          const r = references.find((r) => r.id === id);
          return r ? (
            <li key={id}>
              {r.organization}:{" "}
              {r.status === "checked" ? (
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.title}
                </a>
              ) : (
                "внешняя проверка ожидается"
              )}
            </li>
          ) : null;
        })}
      </ul>
    </aside>
  );
}
