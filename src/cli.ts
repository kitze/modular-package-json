#!/usr/bin/env node

import { parsePackageJson } from "./index.js";
import { prompt } from "./prompt.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const command = process.argv[2];

async function main() {
  const currentDir = process.cwd();
  const packageJsonPath = path.join(currentDir, "package.json");

  switch (command) {
    case "parse":
      await parsePackageJson(packageJsonPath, false);
      break;

    case "write":
      await parsePackageJson(packageJsonPath, true);
      break;

    case "run":
      await prompt(packageJsonPath);
      break;

    default:
      console.log(`
Usage:
  mpj parse - Generate package-preview.json with scripts from YAML files
  mpj write - Update package.json with scripts from YAML files
  mpj run   - Interactive prompt to run package scripts
      `);
      break;
  }
}

main().catch(console.error);
