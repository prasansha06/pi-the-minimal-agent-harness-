# Pi: The Minimal Agent Harness

A lightweight, modular coding agent harness built using the core packages from the Pi agent architecture:
- [`@earendil-works/pi-agent-core`](https://www.npmjs.com/package/@earendil-works/pi-agent-core): The core agent loop, tool execution lifecycle, and event streaming.
- [`@earendil-works/pi-ai`](https://www.npmjs.com/package/@earendil-works/pi-ai): Unified multi-provider LLM interface (Google Gemini, Anthropic Claude, OpenAI).
- [`@earendil-works/pi-schema`](https://www.npmjs.com/package/@earendil-works/pi-schema): Type-safe schema builder (TypeBox wrapper) for tool parameters.

## Architecture

This project demonstrates the minimal anatomy of an autonomous coding agent:

1. **Tools (`src/tools.ts`)**: Primitives that give the LLM hands on the host system:
   - `read_file`: Inspects files before modifying them.
   - `write_file`: Creates new files or overwrites existing ones.
   - `edit_file`: Performs exact target string replacements.
   - `bash`: Runs arbitrary shell commands (build, test, git).

2. **Agent Setup (`src/agent.ts`)**:
   - Registers providers (`googleProvider()`, `anthropicProvider()`, `openAiProvider()`).
   - Resolves provider credentials from environment variables (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
   - Configures the `Agent` loop with streaming and system prompt.

3. **Interactive REPL (`src/index.ts`)**:
   - Streams assistant tokens live to stdout as they arrive.
   - Logs tool invocations and execution results.
   - Prompts the user interactively in a continuous multi-turn session.

## Prerequisites

- [Node.js](https://nodejs.org/) v22.0.0 or higher.
- An API key for Google Gemini, Anthropic, or OpenAI.

## Getting Started

1. Clone or download the repository:
   ```bash
   git clone https://github.com/prasansha06/pi-the-minimal-agent-harness-.git
   cd pi-the-minimal-agent-harness-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your API key:
   Copy `.env.example` to `.env` and fill in your key:
   ```bash
   cp .env.example .env
   ```
   For example, if using Gemini:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the interactive CLI:
   ```bash
   npm start
   ```

5. Type prompts such as:
   - `Create a simple express server in server.js`
   - `Inspect package.json and list all scripts`
   - `Run git status and tell me what changed`

## Scripts

- `npm start`: Runs the CLI using `tsx` (TypeScript execution).
- `npm run typecheck`: Runs `tsc --noEmit` to verify TypeScript types.
- `npm run build`: Compiles TypeScript into `dist/`.

## License

MIT
