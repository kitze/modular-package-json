import fs from "fs";
import { ScriptFile } from "../types.js";
import chalk from "chalk";

type ValidationError = {
  file: string;
  script: string;
  command: string;
  message: string;
};

const PACKAGE_MANAGERS = ["yarn", "npm", "pnpm", "bun"];
const COMMON_CLI_COMMANDS = new Set([
  "node",
  "rm",
  "cp",
  "mv",
  "echo",
  "open",
  "n",
  "sed",
  "webpack",
  "vite",
  "turbo",
  "cross-env",
  "electron-builder",
  "storybook",
]);

function getShortPath(fullPath: string): string {
  return fullPath.split("/").slice(-2).join("/");
}

function validateCommand(
  command: string,
  allScripts: Set<string>,
  scriptName: string,
  fileName: string
): ValidationError | null {
  // Match these patterns:
  // npm run <script>
  // yarn <script>
  // pnpm <script>
  // bun <script>
  const npmRunPattern = /^npm\s+run\s+(\S+)/;
  const otherPackageManagerPattern = /^(yarn|pnpm|bun)\s+(?!run)(\S+)/;

  let match = command.match(npmRunPattern);
  if (match) {
    const referencedScript = match[1];
    if (!allScripts.has(referencedScript)) {
      return {
        file: fileName,
        script: scriptName,
        command,
        message: `Script "${referencedScript}" not found in any YAML script file`,
      };
    }
  }

  match = command.match(otherPackageManagerPattern);
  if (match) {
    const referencedScript = match[2];
    if (!allScripts.has(referencedScript)) {
      return {
        file: fileName,
        script: scriptName,
        command,
        message: `Script "${referencedScript}" not found in any YAML script file`,
      };
    }
  }

  return null;
}

export function validateAllScripts(
  parsedScripts: Array<{ file: string; data: ScriptFile | ScriptFile[] }>,
  packageJsonPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // First collect all script names from ALL YAML files
  const allScriptNames = new Set<string>();

  // Handle both top-level arrays and nested script arrays
  parsedScripts.forEach(({ data }) => {
    // If it's a top-level array of scripts
    if (Array.isArray(data)) {
      data.forEach((script) => {
        if (script.name) {
          allScriptNames.add(script.name);
        }
        // Check for nested scripts array
        if ("scripts" in script && Array.isArray(script.scripts)) {
          script.scripts.forEach((nestedScript) => {
            if (nestedScript.name) {
              allScriptNames.add(nestedScript.name);
            }
          });
        }
      });
    } else {
      // Single script object
      if (data.name) {
        allScriptNames.add(data.name);
      }
      // Check for nested scripts array
      if ("scripts" in data && Array.isArray(data.scripts)) {
        data.scripts.forEach((nestedScript) => {
          if (nestedScript.name) {
            allScriptNames.add(nestedScript.name);
          }
        });
      }
    }
  });

  // Then validate all commands against the complete set of script names
  parsedScripts.forEach(({ file, data }) => {
    const validateScripts = (scripts: ScriptFile[]) => {
      scripts.forEach((script) => {
        if (script.command) {
          const error = validateCommand(
            script.command,
            allScriptNames,
            script.name,
            getShortPath(file)
          );
          if (error) {
            errors.push(error);
          }
        }

        if (script.commands) {
          script.commands.forEach((cmd) => {
            const commandStr = typeof cmd === "string" ? cmd : cmd.command;
            const error = validateCommand(
              commandStr,
              allScriptNames,
              script.name,
              getShortPath(file)
            );
            if (error) {
              errors.push(error);
            }
          });
        }

        // Validate nested scripts
        if ("scripts" in script && Array.isArray(script.scripts)) {
          validateScripts(script.scripts);
        }
      });
    };

    validateScripts(Array.isArray(data) ? data : [data]);
  });

  return errors;
}
