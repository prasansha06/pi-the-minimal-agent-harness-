import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { obj, str } from "@earendil-works/pi-schema";

const execAsync = promisify(exec);

const readFileSchema = obj({
  path: str({ description: "Relative or absolute path to the file." }),
});

export const readFileTool: AgentTool<typeof readFileSchema> = {
  name: "read_file",
  label: "Read File",
  description: "Reads content from a file at the specified path.",
  parameters: readFileSchema,
  execute: async (_toolCallId, params) => {
    try {
      const targetPath = path.resolve(params.path);
      const content = await fs.readFile(targetPath, "utf-8");
      return {
        content: [{ type: "text", text: content }],
        details: { path: targetPath, size: content.length },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error reading file: ${message}` }],
        details: { error: message },
        isError: true,
      };
    }
  },
};

const writeFileSchema = obj({
  path: str({ description: "Path where file should be saved." }),
  content: str({ description: "Full content to write." }),
});

export const writeFileTool: AgentTool<typeof writeFileSchema> = {
  name: "write_file",
  label: "Write File",
  description: "Creates or overwrites a file with new content.",
  parameters: writeFileSchema,
  execute: async (_toolCallId, params) => {
    try {
      const targetPath = path.resolve(params.path);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, params.content, "utf-8");
      return {
        content: [{ type: "text", text: `Successfully wrote ${params.content.length} characters to ${params.path}` }],
        details: { path: targetPath, length: params.content.length },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error writing file: ${message}` }],
        details: { error: message },
        isError: true,
      };
    }
  },
};

const editFileSchema = obj({
  path: str({ description: "Path to the file to edit." }),
  target: str({ description: "Exact string to be replaced (must match exactly)." }),
  replacement: str({ description: "New replacement content." }),
});

export const editFileTool: AgentTool<typeof editFileSchema> = {
  name: "edit_file",
  label: "Edit File",
  description: "Replaces an exact target string in an existing file with replacement content.",
  parameters: editFileSchema,
  execute: async (_toolCallId, params) => {
    try {
      const targetPath = path.resolve(params.path);
      const original = await fs.readFile(targetPath, "utf-8");

      const occurrences = original.split(params.target).length - 1;
      if (occurrences === 0) {
        return {
          content: [{ type: "text", text: `Error: target string not found in ${params.path}` }],
          details: { error: "Target string not found" },
          isError: true,
        };
      }
      if (occurrences > 1) {
        return {
          content: [{
            type: "text",
            text: `Error: target string matches ${occurrences} locations in ${params.path}. Provide a more unique target string.`,
          }],
          details: { error: "Multiple occurrences", occurrences },
          isError: true,
        };
      }

      const updated = original.replace(params.target, params.replacement);
      await fs.writeFile(targetPath, updated, "utf-8");
      return {
        content: [{ type: "text", text: `Successfully replaced target in ${params.path}` }],
        details: { path: targetPath },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error editing file: ${message}` }],
        details: { error: message },
        isError: true,
      };
    }
  },
};

const bashSchema = obj({
  command: str({ description: "Command line to execute in shell." }),
});

export const bashTool: AgentTool<typeof bashSchema> = {
  name: "bash",
  label: "Execute Command",
  description: "Runs a shell command on the host system.",
  parameters: bashSchema,
  execute: async (_toolCallId, params) => {
    try {
      const { stdout, stderr } = await execAsync(params.command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      });

      const output = [stdout, stderr].filter(Boolean).join("\n").trim();
      return {
        content: [{ type: "text", text: output || "(Command completed with no output)" }],
        details: { command: params.command },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Command failed: ${message}` }],
        details: { error: message },
        isError: true,
      };
    }
  },
};

export const defaultTools: AgentTool<any>[] = [
  readFileTool,
  writeFileTool,
  editFileTool,
  bashTool,
];
