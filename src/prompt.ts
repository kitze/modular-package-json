import inquirer from "inquirer";
import inquirerPrompt from "inquirer-autocomplete-prompt";
import fuzzy from "fuzzy";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import * as fs from "fs";
import { parseScriptFile } from "./utils/parse-script-file.js";
import { ScriptFile } from "./types.js";
import { getAllFiles, processScript } from "./utils/script-processing.js";
import { validateAllScripts } from "./utils/validate-scripts.js";
import chalk from "chalk";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register the autocomplete prompt
inquirer.registerPrompt("autocomplete", inquirerPrompt);

export async function prompt(packageJsonPath: string) {
  const scriptsDir = path.join(
    dirname(packageJsonPath),
    "package-scripts",
    "scripts"
  );

  // Verify scripts directory exists
  if (!fs.existsSync(scriptsDir)) {
    console.error(`Scripts directory not found: ${scriptsDir}`);
    console.log(
      "Please create a package-scripts/scripts directory with your YAML script files"
    );
    return;
  }

  // Get all script files recursively
  const scriptFiles = getAllFiles(scriptsDir);

  if (scriptFiles.length === 0) {
    console.log("No script files found in package-scripts/scripts directory");
    return;
  }

  // Parse all files first
  const parsedScripts = scriptFiles
    .map((file) => {
      try {
        return {
          file,
          data: parseScriptFile(fs.readFileSync(file, "utf-8")),
        };
      } catch (error) {
        console.error(`Error parsing file ${file}:`, error);
        return null;
      }
    })
    .filter(
      (script): script is { file: string; data: ScriptFile | ScriptFile[] } =>
        script !== null
    );

  // Validate scripts before processing
  const validationErrors = validateAllScripts(parsedScripts, packageJsonPath);

  if (validationErrors.length > 0) {
    console.error(chalk.red("\nScript validation errors:"));
    validationErrors.forEach(({ file, script, message }) => {
      console.error(chalk.red(`- [${file}] ${script}: ${message}`));
    });
    return;
  }

  // Process scripts into package.json format
  const scripts: Record<string, string> = {};
  const scriptDocs: Record<string, { description?: string; group?: string }> =
    {};

  parsedScripts.forEach(({ data }) => {
    if (!data) return;

    if (Array.isArray(data)) {
      data.forEach((script) => processScript(script, scripts, scriptDocs));
    } else {
      processScript(data, scripts, scriptDocs);
    }
  });

  if (Object.keys(scripts).length === 0) {
    console.log("No scripts found in package-scripts directory");
    return;
  }

  // Group scripts by their group property
  const groupedScripts = Object.entries(scriptDocs).reduce(
    (acc, [name, data]) => {
      const group = data.group || "other";
      if (!acc[group]) acc[group] = [];
      acc[group].push({
        name,
        description: data.description,
        group,
      });
      return acc;
    },
    {} as Record<
      string,
      Array<{ name: string; description?: string; group: string }>
    >
  );

  // Create choices without the separators for fuzzy search
  const searchableChoices = Object.values(groupedScripts).flatMap((scripts) =>
    scripts.map((script) => ({
      name: `${script.name}${
        script.description ? ` - ${script.description}` : ""
      }`,
      value: script.name,
      group: script.group,
    }))
  );

  // Fuzzy search function
  const searchScripts = async (_: any, input = "") => {
    const fuzzyResult = fuzzy.filter(input || "", searchableChoices, {
      extract: (choice) => choice.name,
    });

    // If no input, show grouped list
    if (!input) {
      return Object.entries(groupedScripts).flatMap(([group, scripts]) => [
        new inquirer.Separator(`\n--- ${group} ---`),
        ...scripts.map((script) => ({
          name: `${script.name}${
            script.description ? ` - ${script.description}` : ""
          }`,
          value: script.name,
        })),
      ]);
    }

    // Return fuzzy search results
    return fuzzyResult.map((result) => ({
      name: result.original.name,
      value: result.original.value,
    }));
  };

  const { script } = await inquirer.prompt([
    {
      type: "autocomplete",
      name: "script",
      message: "Select or search for a script to run:",
      source: searchScripts,
      pageSize: 20,
    },
  ]);

  console.log(`Running: npm run ${script}`);
  const { stdout, stderr } = await execAsync(`nr ${script}`);

  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
}
