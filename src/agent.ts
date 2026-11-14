import { Agent } from "@earendil-works/pi-agent-core";
import { createModels, type Model, type Api } from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { googleProvider } from "@earendil-works/pi-ai/providers/google";
import { groqProvider } from "@earendil-works/pi-ai/providers/groq";
import { defaultTools } from "./tools.js";

export interface HarnessConfig {
  provider?: string;
  modelId?: string;
  systemPrompt?: string;
}

const DEFAULT_PROVIDER_MODELS: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
  google: "gemini-flash-latest",
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

export function createHarnessAgent(config: HarnessConfig = {}): Agent {
  const models = createModels();

  // Register supported LLM providers
  models.setProvider(groqProvider());
  models.setProvider(googleProvider());
  models.setProvider(anthropicProvider());
  models.setProvider(openaiProvider());

  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  // Determine provider from config, env, or available API keys
  let providerId = config.provider || process.env.AI_PROVIDER?.trim();
  if (!providerId) {
    if (groqKey) {
      providerId = "groq";
    } else if (geminiKey) {
      providerId = "google";
    } else if (anthropicKey) {
      providerId = "anthropic";
    } else if (openaiKey) {
      providerId = "openai";
    }
  }

  if (!providerId) {
    throw new Error(
      "No API key found. Please open .env and add GROQ_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY."
    );
  }

  // Validate that the selected provider actually has an API key
  if (providerId === "groq" && !groqKey) {
    throw new Error("Provider 'groq' is selected, but GROQ_API_KEY is empty in .env.");
  }
  if (providerId === "google" && !geminiKey) {
    throw new Error("Provider 'google' is selected, but GEMINI_API_KEY is empty in .env.");
  }
  if (providerId === "anthropic" && !anthropicKey) {
    throw new Error("Provider 'anthropic' is selected, but ANTHROPIC_API_KEY is empty in .env.");
  }
  if (providerId === "openai" && !openaiKey) {
    throw new Error("Provider 'openai' is selected, but OPENAI_API_KEY is empty in .env.");
  }

  // Find model
  const availableModels = models.getModels(providerId);
  if (availableModels.length === 0) {
    throw new Error(
      `No models registered for provider '${providerId}'. Available providers: groq, google, anthropic, openai.`
    );
  }

  const requestedModelId = config.modelId || process.env.AI_MODEL?.trim();
  let selectedModel: Model<Api> | undefined;

  if (requestedModelId) {
    selectedModel = models.getModel(providerId, requestedModelId);
    if (!selectedModel) {
      console.warn(
        `Requested model '${requestedModelId}' not found for provider '${providerId}'. Falling back to default.`
      );
    }
  }

  // If no model requested or not found, try the preferred default for the provider
  if (!selectedModel) {
    const preferredId = DEFAULT_PROVIDER_MODELS[providerId];
    if (preferredId) {
      selectedModel = models.getModel(providerId, preferredId);
    }
  }

  // Fallback to first registered model
  if (!selectedModel) {
    selectedModel = availableModels[0];
  }

  const systemPrompt =
    config.systemPrompt ||
    `You are an expert autonomous software engineer.
You work in the current workspace directory.
You can read files, write files, make precise string edits, and run shell commands.
Always read a file before modifying it.
Work methodically, verify your changes, and explain your steps clearly.`;

  return new Agent({
    initialState: {
      systemPrompt,
      model: selectedModel,
      tools: defaultTools,
    },
    streamFn: models.streamSimple.bind(models),
  });
}
