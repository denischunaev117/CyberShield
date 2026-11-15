export type IncidentTopic =
  | "suspicious-contact"
  | "credentials"
  | "payment"
  | "device"
  | "phishing-site"
  | "account-takeover"
  | "unknown";
export type IncidentNode = {
  id: string;
  question: string;
  answers: { id: string; title: string; next: string }[];
};
export type IncidentGuide = {
  id: string;
  revision: number;
  topic: IncidentTopic;
  title: string;
  intro: string;
  stepsNow: string[];
  stepsLater: string[];
  evidence: string[];
  avoid: string[];
  sourceIds: string[];
  relatedScenarioIds: string[];
};
export function validateFlows(
  roots: Record<IncidentTopic, string>,
  nodes: Record<string, IncidentNode>,
  guides: Record<string, IncidentGuide>,
  scenarioIds: Set<string>,
  referenceIds: Set<string>,
) {
  const reached = new Set<string>();
  function visit(id: string, path: Set<string>) {
    if (path.has(id)) throw Error("Цикл помощника");
    reached.add(id);
    if (guides[id]) return;
    const n = nodes[id];
    if (
      !n ||
      n.answers.length < 2 ||
      n.answers.length > 4 ||
      !n.answers.some((a) => /не знаю|не уверен/i.test(a.title))
    )
      throw Error(`Недопустимый вопрос ${id}`);
    for (const a of n.answers) visit(a.next, new Set([...path, id]));
  }
  for (const id of Object.values(roots)) visit(id, new Set());
  for (const [id, g] of Object.entries(guides)) {
    if (
      !reached.has(id) ||
      g.revision !== 1 ||
      !g.stepsNow.length ||
      !g.sourceIds.length ||
      g.sourceIds.some((s) => !referenceIds.has(s)) ||
      g.relatedScenarioIds.some((s) => !scenarioIds.has(s))
    )
      throw Error(`Недопустимая инструкция ${id}`);
  }
  for (const id of Object.keys(nodes))
    if (!reached.has(id)) throw Error(`Недостижимый вопрос ${id}`);
}
