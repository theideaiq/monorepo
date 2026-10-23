import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { keys } from "../keys";

export type ChatProvider = "google" | "openai";

const DEFAULT_CHAT_MODELS: Record<ChatProvider, string> = {
  google: "gemini-flash-latest",
  openai: "gpt-4o-mini",
};

interface ChatModelSettings {
  AI_CHAT_MODEL?: string;
  AI_PROVIDER?: ChatProvider;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

/**
 * The chat model picked from the environment: `AI_PROVIDER` (Gemini by
 * default) with its API key, and `AI_CHAT_MODEL` to override the model id.
 * Returns undefined when the chosen provider has no API key, so callers can
 * turn AI features off instead of failing at request time.
 */
export const getChatModel = (
  settings: ChatModelSettings = keys()
): LanguageModel | undefined => {
  const provider = settings.AI_PROVIDER ?? "google";
  const modelId = settings.AI_CHAT_MODEL ?? DEFAULT_CHAT_MODELS[provider];

  if (provider === "openai") {
    return settings.OPENAI_API_KEY
      ? createOpenAI({ apiKey: settings.OPENAI_API_KEY })(modelId)
      : undefined;
  }

  return settings.GOOGLE_GENERATIVE_AI_API_KEY
    ? createGoogleGenerativeAI({
        apiKey: settings.GOOGLE_GENERATIVE_AI_API_KEY,
      })(modelId)
    : undefined;
};

const openai = createOpenAI({
  apiKey: keys().OPENAI_API_KEY,
});

export const models = {
  chat: openai("gpt-4o-mini"),
  embeddings: openai.embedding("text-embedding-3-small"),
};
