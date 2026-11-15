import { references } from "../../content/references";
import { contentReviews } from "../../content/content-reviews";
import type { FeatureProps } from "../types";
import { FeatureFrame } from "../shared";
export default function ReferencesPage({ onNavigate }: FeatureProps) {
  return (
    <FeatureFrame
      title="Источники и методика"
      description="Показываем происхождение рекомендаций, состояние проверки и ограничения учебной модели."
      onNavigate={onNavigate}
    >
      <section className="feature-panel">
        <h2>Как создаются сценарии</h2>
        <p>
          100 историй — вымышленные учебные адаптации. Настоящее обращение
          внутри сюжета не означает документально подтверждённое дело. Тип
          обращения раскрывается в разборе, а не до выбора.
        </p>
        <p>
          Идеи пользовательских каталогов проходят отбор, построение ветвей,
          проверку логики и методический просмотр. Автоматические тесты не
          заменяют экспертизу.
        </p>
      </section>
      <section>
        <h2>Источники рекомендаций</h2>
        <p>
          Дата проверки указана только для действительно прочитанных материалов.
          Для остальных записей отмечена попытка доступа, а не подтверждение
          содержания.
        </p>
        <div className="reference-list">
          {references.map((r) => (
            <article className="feature-panel" key={r.id}>
              <span className="status-chip">
                {r.status === "checked"
                  ? "Материал прочитан"
                  : "Требует внешней проверки"}
              </span>
              <h3>{r.title}</h3>
              <p>
                <b>{r.organization}</b>
              </p>
              {r.status === "checked" ? (
                <>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    Открыть подтверждённую страницу
                  </a>
                  <p>Проверка: {r.checkedAt}</p>
                </>
              ) : (
                <p>
                  Попытка доступа: {r.attemptedAt}. Ссылка не предлагается как
                  проверенный контакт.
                </p>
              )}
              <p>{r.note}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="feature-panel">
        <h2>Как проверяются рекомендации</h2>
        <p>
          В реестре:{" "}
          {
            contentReviews.filter((r) => r.contentId.startsWith("scenario:"))
              .length
          }{" "}
          учебных историй,{" "}
          {
            contentReviews.filter((r) => r.contentId.startsWith("guide:"))
              .length
          }{" "}
          инструкций помощи и{" "}
          {contentReviews.filter((r) => r.contentId.startsWith("rule:")).length}{" "}
          правил анализа. Независимая экспертиза этих материалов ожидается.
        </p>
        <p>
          Черновик → факты и ссылки → методическая проверка → независимая
          экспертная проверка при её наличии → публикация. Новые алгоритмы
          помощи и проверки сообщений имеют редакцию 1 и ожидают независимой
          проверки для Беларуси. Бейджей «проверено экспертом» у них нет.
        </p>
        <button
          className="secondary no-print"
          onClick={() => onNavigate("share")}
        >
          Сообщить об ошибке без личных данных
        </button>
      </section>
      <section className="feature-panel">
        <h2>Ограничения</h2>
        <p>
          КиберЩит не банк и не правоохранительная структура. Он не блокирует
          счета, не подаёт официальных заявлений и не гарантирует возврат денег.
          Диагностика показывает выполнение учебных заданий, а не доказанный
          эффект обучения или свойства личности. Реальный пилот и независимая
          экспертиза пока не проводились.
        </p>
      </section>
    </FeatureFrame>
  );
}
