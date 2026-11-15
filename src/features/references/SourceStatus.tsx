import { references } from "../../content/references";
export function SourceStatus({
  ids,
  revision = 1,
}: {
  ids: string[];
  revision?: number;
}) {
  return (
    <aside className="source-status">
      <b>Рекомендации требуют независимой проверки</b>
      <p>
        Редакция {revision}. Использованы переданные материалы и учебные
        правила; экспертное заключение не получено. Остановка общения сама по
        себе не отменяет уже возникшие последствия.
      </p>
      <ul>
        {ids.map((id) => {
          const r = references.find((r) => r.id === id);
          return r ? (
            <li key={id}>
              <b>{r.organization}</b> — {r.title}
            </li>
          ) : null;
        })}
      </ul>
    </aside>
  );
}
