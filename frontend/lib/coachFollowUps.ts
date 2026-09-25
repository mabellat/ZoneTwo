const STARTER_PROMPTS = [
  "Review my last 4 weeks and suggest a race goal",
  "Build a half marathon plan from my current mileage",
  "I missed training this week — how should I adjust?",
];

const POOLS: Record<string, string[]> = {
  plan: [
    "What should week 1 look like day by day?",
    "How do I know if the plan is too aggressive?",
    "Adjust the plan if my long run is on Sundays",
  ],
  zones: [
    "Am I spending enough time in Zone 2?",
    "What pace should easy runs feel like?",
    "How do I set HR zones in Settings?",
  ],
  load: [
    "Is my ACWR in a safe range right now?",
    "Should I take an extra rest day this week?",
    "How does this week compare to my 4-week average?",
  ],
  race: [
    "What weekly mileage should I target before race day?",
    "When should I start tapering?",
    "What should my last long run be?",
  ],
  default: [
    "Summarize what I should focus on this week",
    "What’s one thing I should change in my training?",
    "How does my recent volume trend look?",
  ],
};

function poolForConversation(lastUser: string, lastAssistant?: string): string[] {
  const blob = `${lastUser} ${lastAssistant ?? ""}`.toLowerCase();
  if (/plan|marathon|half|week|session|schedule/.test(blob)) return POOLS.plan;
  if (/zone|z2|heart rate|hr|easy|pace/.test(blob)) return POOLS.zones;
  if (/load|acwr|fatigue|tired|recovery/.test(blob)) return POOLS.load;
  if (/race|taper|goal|pr/.test(blob)) return POOLS.race;
  return POOLS.default;
}

/** Suggested next questions after a coach reply (or on empty state). */
export function coachFollowUpPrompts(
  messages: { role: string; content: string }[],
  loading: boolean
): string[] {
  if (loading) return [];

  if (messages.length === 0) return STARTER_PROMPTS;

  const last = messages[messages.length - 1];
  if (last.role !== "assistant") return [];

  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const pool = poolForConversation(lastUser, last.content);

  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content.trim()));
  const picks = pool.filter((p) => !asked.has(p));
  const fallback = POOLS.default.filter((p) => !asked.has(p));
  const merged = [...picks, ...fallback, ...STARTER_PROMPTS];
  const unique: string[] = [];
  for (const p of merged) {
    if (!unique.includes(p) && !asked.has(p)) unique.push(p);
    if (unique.length >= 3) break;
  }
  return unique;
}
