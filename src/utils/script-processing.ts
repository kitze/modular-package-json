import * as fs from "fs";
import path from "path";
import { ScriptFile, CommandConfig } from "../types.js";

export function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (
      item.endsWith(".script.yaml") ||
      (item.endsWith(".yaml") && !item.endsWith(".script.yaml"))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export function processScript(
  scriptData: ScriptFile | { scripts: ScriptFile[] },
  scripts: Record<string, string>,
  scriptDocs: Record<string, { description?: string; group?: string }>
) {
  // Handle nested scripts array
  if ("scripts" in scriptData && Array.isArray(scriptData.scripts)) {
    scriptData.scripts.forEach((script) => {
      processScriptItem(script, scripts, scriptDocs);
    });
    return;
  }

  // Handle single script
  processScriptItem(scriptData as ScriptFile, scripts, scriptDocs);
}

function processScriptItem(
  scriptData: ScriptFile,
  scripts: Record<string, string>,
  scriptDocs: Record<string, { description?: string; group?: string }>
) {
  if (!scriptData || !scriptData.name) {
    console.error("Invalid script item:", scriptData);
    return;
  }

  // Process commands - handle both single command and commands array
  let processedCommands: string[];

  if (scriptData.command) {
    processedCommands = [processCommand(scriptData.command, scriptData)];
  } else if (scriptData.commands) {
    processedCommands = scriptData.commands.map((cmd) =>
      typeof cmd === "string" ? cmd : processCommand(cmd.command, cmd)
    );
  } else {
    console.error(`Script ${scriptData.name} has no command or commands field`);
    return;
  }

  scripts[scriptData.name] = processedCommands.join(" && ");

  // Store documentation info
  if (scriptData.description || scriptData.group) {
    scriptDocs[scriptData.name] = {
      description: scriptData.description,
      group: scriptData.group,
    };
  }
}

function processCommand(
  command: string,
  config: CommandConfig | ScriptFile
): string {
  let finalCommand = command;

  // Handle node version
  if ("node" in config && config.node) {
    finalCommand = `n exec ${config.node} ${finalCommand}`;
  }

  // Handle environment file (should be processed before env variables)
  if ("env-file" in config && config["env-file"]) {
    finalCommand = `env-cmd -f ./${config["env-file"]} ${finalCommand}`;
  }

  // Handle environment variables
  if ("env" in config && config.env) {
    const envVars = Object.entries(config.env)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");
    finalCommand = `cross-env ${envVars} ${finalCommand}`;
  }

  // Handle arguments
  if ("args" in config && config.args) {
    const args = Object.entries(config.args)
      .map(([key, value]) => {
        if (typeof value === "boolean") {
          return value ? `--${key}` : "";
        }
        return `--${key}=${value}`;
      })
      .filter(Boolean)
      .join(" ");

    if (args) {
      finalCommand = `${finalCommand} ${args}`;
    }
  }

  return finalCommand;
}
