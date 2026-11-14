import { Agent } from "@earendil-works/pi-agent-core";
import { createModels, type Model, type Api } from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { googleProvider } from "@earendil-works/pi-ai/providers/google";
import { defaultTools } from "./tools.js";

export interface HarnessConfig {
  provider?: string;
  modelId?: string;
  systemPrompt?: string;
}

export function createHarnessAgent(config: HarnessConfig = {}): Agent {
  const models = createModels();

  // Register common LLM providers
  models.setProvider(googleProvider());
  models.setProvider(anthropicProvider());
  models.setProvider(openaiProvider());

  // Determine provider from config, env, or available API keys
  let providerId = config.provider || process.env.AI_PROVIDER;
  if (!providerId) {
    if (process.env.GEMINI_API_KEY) {
      providerId = "google";
    } else if (process.env.ANTHROPIC_API_KEY) {
      providerId = "anthropic";
    } else if (process.env.OPENAI_API_KEY) {
      providerId = "openai";
    } else {
      providerId = "google";
    }
  }

  // Find model
  const availableModels = models.getModels(providerId);
  if (availableModels.length === 0) {
    throw new Error(
      `No models registered for provider '${providerId}'. Available providers: google, anthropic, openai.`
    );
  }

  const requestedModelId = config.modelId || process.env.AI_MODEL;
  let selectedModel: Model<Api> | undefined;

  if (requestedModelId) {
    selectedModel = models.getModel(providerId, requestedModelId);
    if (!selectedModel) {
      console.warn(
        `Requested model '${requestedModelId}' not found for provider '${providerId}'. Falling back to default.`
      );
    }
  }

  if (!selectedModel) {
    // Pick the first available chat model
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
