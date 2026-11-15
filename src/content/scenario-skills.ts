import { scenarios } from "./scenarios";
import { recoveryKinds, type RecoveryKind } from "../debrief";
import { skillIds, type SkillId } from "./skills";
const basis: Record<RecoveryKind, SkillId[]> = {
  money: ["payee", "purpose", "pressure"],
  bank: ["codes", "payee", "purpose"],
  account: ["codes", "account"],
  device: ["permissions", "links"],
  privacy: ["authority", "codes"],
  contract: ["authority", "purpose", "payee"],
  health: ["authority", "pressure"],
  obligation: ["purpose", "reality"],
  trade: ["payee", "authority"],
  crypto: ["payee", "account", "links"],
  verification: ["identity", "reality"],
};
const overrides: Record<string, SkillId[]> = {
  "friend-account": ["identity", "payee", "pressure"],
  "friend-real": ["identity", "reality", "payee"],
  "call-family-real": ["identity", "reality", "purpose"],
  "wa-friend-real": ["identity", "reality", "payee"],
  "call-relative-accident-real": ["identity", "reality", "payee"],
  "friend-business-real": ["identity", "purpose", "reality"],
  "tg-director": ["authority", "identity", "payee"],
  "tg-vote": ["codes", "identity", "account"],
  "call-mobile": ["authority", "codes", "account"],
  "call-bank": ["authority", "payee", "pressure"],
  "premium-gift": ["links", "codes", "account"],
  "bank-telegram-bot": ["codes", "account", "authority"],
  "car-payment-proof": ["payee", "purpose"],
  "call-secret-operation": ["authority", "pressure", "payee"],
  "private-message-pressure": ["pressure", "account", "purpose"],
  "game-pressure": ["pressure", "identity", "payee"],
  "scholarship-real": ["authority", "purpose", "reality"],
  "charity-consent-check": ["authority", "identity", "purpose"],
  "charity-report-real": ["authority", "reality", "purpose"],
  "tickets-real": ["identity", "codes", "reality"],
};
export const scenarioSkills: Record<string, SkillId[]> = Object.fromEntries(
  scenarios.map((s) => {
    const tags = [...(overrides[s.id] ?? basis[recoveryKinds.get(s.id)!])];
    if (s.reality === "legitimate" && !tags.includes("reality"))
      tags.splice(2, 1, "reality");
    return [s.id, tags];
  }),
);
export function validateScenarioSkills() {
  for (const s of scenarios) {
    const tags = scenarioSkills[s.id];
    if (
      !tags ||
      tags.length < 1 ||
      tags.length > 3 ||
      new Set(tags).size !== tags.length ||
      tags.some((t) => !skillIds.includes(t))
    )
      throw Error(`Навыки: ${s.id}`);
  }
  if (
    Object.keys(scenarioSkills).some(
      (id) => !scenarios.some((s) => s.id === id),
    )
  )
    throw Error("Неизвестная история в карте навыков");
}
