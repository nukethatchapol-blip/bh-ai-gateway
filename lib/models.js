// Catalog of selectable models — must match seed data in chats.
export const MODELS = [
  { id: "gpt-5.5",      provider: "openai",    label: "GPT-5.5",         tier: "frontier", ctx: "1M",   speed: "fast", cost: "$$$" },
  { id: "gpt-4o",       provider: "openai",    label: "GPT-4o",          tier: "flagship", ctx: "128K", speed: "fast", cost: "$$" },
  { id: "claude-4.5-s", provider: "anthropic", label: "Claude Sonnet 4.5", tier: "flagship", ctx: "200K", speed: "fast", cost: "$$" },
  { id: "claude-4.7-o", provider: "anthropic", label: "Claude Opus 4.7", tier: "frontier", ctx: "200K", speed: "deep", cost: "$$$$" },
];

export const PROVIDER_LABEL = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  mistral: "Mistral",
  groq: "Groq",
  openrouter: "OpenRouter",
};

export const PROVIDER_PREFIX = {
  openai: "sk-proj-",
  anthropic: "sk-ant-",
  google: "AIza",
  mistral: "mk-",
  groq: "gsk_",
  openrouter: "sk-or-",
};

export function modelById(id) {
  return MODELS.find((m) => m.id === id);
}
