import { lazy, Suspense, Component, type ReactNode } from "react";
import type { FeaturePage, FeatureProps } from "./types";
const Emergency = lazy(() => import("./emergency/EmergencyPage"));
const MessageCheck = lazy(() => import("./message-check/MessageCheckPage"));
const References = lazy(() => import("./references/ReferencesPage"));
const Diagnostics = lazy(() => import("./diagnostics/DiagnosticsPage"));
const Classroom = lazy(() => import("./classroom/ClassroomPage"));
const LearningPlan = lazy(() => import("./learning-plan/LearningPlanPage"));
export function warmLocalTools() {
  return Promise.allSettled([
    import("./emergency/EmergencyPage"),
    import("./message-check/MessageCheckPage"),
    import("./diagnostics/DiagnosticsPage"),
    import("./classroom/ClassroomPage"),
    import("./learning-plan/LearningPlanPage"),
    import("./references/ReferencesPage"),
  ]);
}
export default function FeatureRouter({
  page,
  ...props
}: FeatureProps & { page: FeaturePage }) {
  const Page =
    page === "emergency"
      ? Emergency
      : page === "message-check"
        ? MessageCheck
        : page === "references"
          ? References
          : page === "diagnostics"
            ? Diagnostics
            : page === "classroom"
              ? Classroom
              : LearningPlan;
  return (
    <FeatureBoundary key={page} onNavigate={props.onNavigate}>
      <Suspense fallback={<p role="status">Открываем раздел…</p>}>
        {Page && <Page {...props} />}
      </Suspense>
    </FeatureBoundary>
  );
}
class FeatureBoundary extends Component<
  { children: ReactNode; onNavigate: FeatureProps["onNavigate"] },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="feature-panel" role="alert">
        <h1>Не удалось открыть раздел</h1>
        <p>
          Проверьте подключение и обновите страницу. Для занятия без интернета
          заранее откройте нужные материалы. Остальная практика остаётся
          доступна.
        </p>
        <button
          className="secondary"
          onClick={() => this.props.onNavigate("practice")}
        >
          Вернуться к практике
        </button>
      </section>
    ) : (
      this.props.children
    );
  }
}
