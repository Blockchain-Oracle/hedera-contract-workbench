import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { WorkbenchError } from "@sh/core";

export function chatProviderOptions(provider: string) {
  // Replay local conversation content instead of referencing provider items
  // that may never have been persisted when the user stopped a stream.
  return provider === "openai" ? { openai: { store: false } } : undefined;
}

export function chatModel(
  configuration: {
    provider: string;
    model: string;
    key: string;
  },
  transport?: { fetch?: typeof fetch },
) {
  if (configuration.provider === "openai")
    return createOpenAI({ apiKey: configuration.key, ...transport })(
      configuration.model,
    );
  if (configuration.provider === "anthropic")
    return createAnthropic({ apiKey: configuration.key, ...transport })(
      configuration.model,
    );
  if (configuration.provider === "gemini")
    return createGoogle({ apiKey: configuration.key, ...transport })(
      configuration.model,
    );
  throw new WorkbenchError(
    "CONFIG",
    "Choose openai, anthropic, or gemini for chat.",
  );
}
