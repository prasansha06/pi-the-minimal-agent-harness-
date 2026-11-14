import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createHarnessAgent } from "./agent.js";

// Load environment variables from .env if present
try {
  process.loadEnvFile();
} catch {
  // .env file is optional if env vars are already exported in shell
}

async function main() {
  console.log("=== Pi Minimal Agent Harness ===");

  let agent;
  try {
    agent = createHarnessAgent();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error initializing agent: ${message}`);
    console.error("Please configure an API key in your environment or .env file:");
    console.error("  export GEMINI_API_KEY=your_key  # or ANTHROPIC_API_KEY / OPENAI_API_KEY");
    process.exit(1);
  }

  console.log(`Model: ${agent.state.model.provider} / ${agent.state.model.id}`);
  console.log(`Tools: ${agent.state.tools.map((t) => t.name).join(", ")}`);
  console.log("Type your prompt or 'exit' to quit.\n");

  // Subscribe to agent streaming and tool execution events
  agent.subscribe((event) => {
    switch (event.type) {
      case "message_update":
        if (event.assistantMessageEvent.type === "text_delta") {
          output.write(event.assistantMessageEvent.delta);
        }
        break;

      case "tool_execution_start":
        output.write(`\n\x1b[36m-> [tool:${event.toolName}]\x1b[0m `);
        try {
          const argsPreview = JSON.stringify(event.args);
          output.write(argsPreview.length > 80 ? `${argsPreview.slice(0, 77)}...` : argsPreview);
        } catch {
          // Ignore JSON serialization issues
        }
        output.write("\n");
        break;

      case "tool_execution_end":
        if (event.isError) {
          output.write(`\x1b[31m<- [tool:${event.toolName} failed]\x1b[0m\n`);
        } else {
          output.write(`\x1b[32m<- [tool:${event.toolName} done]\x1b[0m\n`);
        }
        break;

      case "agent_end":
        output.write("\n\n");
        break;
    }
  });

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const promptText = await rl.question("\x1b[1muser>\x1b[0m ");
      const trimmed = promptText.trim();

      if (!trimmed) continue;
      if (trimmed === "exit" || trimmed === "quit") {
        console.log("Exiting.");
        break;
      }

      try {
        await agent.prompt(trimmed);
      } catch (promptError: unknown) {
        const message = promptError instanceof Error ? promptError.message : String(promptError);
        console.error(`\x1b[31mError during execution: ${message}\x1b[0m\n`);
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
