export type Choice = {
  id: string;
  text: string;
  next: string;
  assessment: "safe" | "caution" | "risk";
  explanation: string;
};
export type Channel =
  | "viber"
  | "sms"
  | "telegram"
  | "whatsapp"
  | "call"
  | "email"
  | "web"
  | "instagram";
export type Evidence = {
  kind: "notification" | "document" | "permissions";
  title: string;
  rows: { label: string; value: string }[];
};
export type Scene = {
  evidence?: Evidence;
  channel?: Channel;
  sender?: string;
  message: string;
  context?: string;
  speaker?: "narrator";
  audio?: string;
  choices: Choice[];
};
export type Ending = {
  title: string;
  message: string;
  outcome: "safe" | "caution" | "risk";
};
export type Scenario = {
  id: string;
  title: string;
  description: string;
  topic: string;
  channel: Channel;
  sourceIdea?: number;
  source?: { document: "belarus-2026"; idea: number };
  sender: string;
  avatar: string;
  duration: string;
  difficulty: string;
  reality: "fraud" | "legitimate";
  start: string;
  nodes: Record<string, Scene>;
  endings: Record<string, Ending>;
  lessons: string[];
  commonMistakes?: string[];
};
export type Step = { node: string; choice: Choice };
export function advance(
  scenario: Scenario,
  node: string,
  choiceId: string,
): Choice {
  const choice = scenario.nodes[node]?.choices.find((c) => c.id === choiceId);
  if (
    !choice ||
    (!scenario.nodes[choice.next] && !scenario.endings[choice.next])
  )
    throw new Error("Недопустимый переход сценария");
  return choice;
}
export function validateScenario(s: Scenario) {
  if (!s.nodes[s.start]) throw new Error(`Нет начала: ${s.id}`);
  const visited = new Set<string>();
  function visit(id: string, path: Set<string>) {
    if (path.has(id)) throw new Error(`Цикл: ${id}`);
    if (s.endings[id]) {
      visited.add(id);
      return;
    }
    const node = s.nodes[id];
    if (!node || node.choices.length < 3)
      throw new Error(`Нужно минимум 3 ответа: ${id}`);
    if (new Set(node.choices.map((c) => c.id)).size !== node.choices.length)
      throw new Error("Повтор ID ответа");
    visited.add(id);
    for (const c of node.choices) {
      advance(s, id, c.id);
      visit(c.next, new Set([...path, id]));
    }
  }
  visit(s.start, new Set());
  if (Object.keys({ ...s.nodes, ...s.endings }).some((id) => !visited.has(id)))
    throw new Error("Недостижимый узел");
}

export function sceneIdentity(
  s: Scenario,
  nodeId: string,
): { channel: Channel; sender: string } {
  const node = s.nodes[nodeId];
  if (!node) throw new Error("Неизвестный узел");
  return {
    channel: node.channel ?? s.channel,
    sender:
      node.speaker === "narrator"
        ? "Результат вашего действия"
        : (node.sender ?? s.sender),
  };
}

export function scenarioChannels(s: Scenario): Channel[] {
  return [
    ...new Set([
      s.channel,
      ...Object.values(s.nodes).flatMap((n) => (n.channel ? [n.channel] : [])),
    ]),
  ];
}
