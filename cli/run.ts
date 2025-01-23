import inquirer from "inquirer";
import inquirerPrompt from "inquirer-autocomplete-prompt";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import fuzzy from "fuzzy";

// Register the autocomplete prompt
inquirer.registerPrompt("autocomplete", inquirerPrompt);

interface Script {
  name: string;
  description?: string;
  group?: string;
}

async function main() {
  // Read scripts-docs.json for metadata
  const docsPath = path.join(
    __dirname,
    "..",
    "..",
    "package-json",
    "scripts-docs.json"
  );
  const scriptDocs = JSON.parse(fs.readFileSync(docsPath, "utf-8"));

  // Convert to array of scripts with metadata
  const scripts: Script[] = Object.entries(scriptDocs).map(
    ([name, data]: [string, any]) => ({
      name,
      description: data.description,
      group: data.group,
    })
  );

  // Group scripts
  const groupedScripts = scripts.reduce((acc, script) => {
    const group = script.group || "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(script);
    return acc;
  }, {} as Record<string, Script[]>);

  // Create choices with group headers
  const choices = Object.entries(groupedScripts).flatMap(([group, scripts]) => [
    new inquirer.Separator(`\n--- ${group} ---`),
    ...scripts.map((script) => ({
      name: `${script.name}${
        script.description ? ` - ${script.description}` : ""
      }`,
      value: script.name,
      group,
    })),
  ]);

  // Fuzzy search function
  const searchScripts = (answers: any, input = "") => {
    return new Promise((resolve) => {
      const fuzzyResult = fuzzy.filter(input, choices, {
        extract: (el) => {
          if (el instanceof inquirer.Separator) return el.line;
          return el.name;
        },
      });

      resolve(
        fuzzyResult.map((el) => {
          if (el.original instanceof inquirer.Separator) {
            return el.original;
          }
          return el.original;
        })
      );
    });
  };

  try {
    const { script } = await inquirer.prompt([
      {
        type: "autocomplete",
        name: "script",
        message: "Select a script to run:",
        source: searchScripts,
        pageSize: 20,
      },
    ]);

    console.log(`\nRunning: yarn ${script}`);
    execSync(`yarn ${script}`, { stdio: "inherit" });
  } catch (error) {
    console.error("Error running script:", error);
    process.exit(1);
  }
}

main().catch(console.error);
