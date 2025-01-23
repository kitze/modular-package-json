import { promises as fs } from "fs";
import * as fsSync from "fs";
import path from "path";
import { parseScriptFile } from "./utils/parse-script-file.js";
import { generatePackageJson } from "./utils/generate-package-json.js";
import { getAllFiles, processScript } from "./utils/script-processing.js";
import { validateAllScripts } from "./utils/validate-scripts.js";
import chalk from "chalk";

export async function parsePackageJson(
  packageJsonPath: string,
  writeToFile = false
) {
  try {
    // Read original package.json
    const content = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);

    // Get scripts from YAML files
    const scriptsDir = path.join(
      path.dirname(packageJsonPath),
      "package-scripts",
      "scripts"
    );
    const scriptFiles = getAllFiles(scriptsDir);

    // Validate scripts before processing
    const validationErrors = validateAllScripts(
      scriptFiles.map((file) => ({
        file,
        data: parseScriptFile(fsSync.readFileSync(file, "utf-8")),
      })),
      packageJsonPath
    );

    if (validationErrors.length > 0) {
      console.error(chalk.red("\nScript validation errors:"));
      validationErrors.forEach(({ file, script, message }) => {
        console.error(chalk.red(`- [${file}] ${script}: ${message}`));
      });
      // Don't return, continue with processing
    }

    // Process scripts
    const scripts: Record<string, string> = {};
    const scriptDocs: Record<string, { description?: string; group?: string }> =
      {};

    for (const file of scriptFiles) {
      const fileContent = await fs.readFile(file, "utf-8");
      const data = parseScriptFile(fileContent);

      if (Array.isArray(data)) {
        data.forEach((script) => processScript(script, scripts, scriptDocs));
      } else if (data) {
        processScript(data, scripts, scriptDocs);
      }
    }

    // Generate new package.json content
    const newPackageJson = {
      ...packageJson,
      scripts,
    };

    if (writeToFile) {
      // For mpj write - modify the original
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(newPackageJson, null, 2)
      );
      console.log("Updated package.json with new scripts");
    } else {
      // For mpj parse - create preview file
      const previewPath = path.join(
        path.dirname(packageJsonPath),
        "package-preview.json"
      );
      await fs.writeFile(previewPath, JSON.stringify(newPackageJson, null, 2));
      console.log("Generated package-preview.json");
    }

    return newPackageJson;
  } catch (error) {
    console.error("Error processing package.json:", error);
    throw error;
  }
}
