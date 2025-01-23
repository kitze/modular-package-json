import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { parseScriptFile } from './utils/parse-script-file';
import { generatePackageJson } from './utils/generate-package-json';
import { wrapCommand } from './utils/wrap-command';
import { ScriptFile } from './types';
import { validateAllScripts } from './utils/validate-scripts';

function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (
      item.endsWith('.script.yaml') ||
      (item.endsWith('.yaml') && !item.endsWith('.script.yaml'))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log('Starting script processing...');
  const scriptsDir = path.join(__dirname, '..', 'package-scripts', 'scripts');

  // Get all script files recursively
  const scriptFiles = getAllFiles(scriptsDir);

  // Parse all files first
  const parsedScripts = scriptFiles.map((file) => ({
    file,
    data: parseScriptFile(fs.readFileSync(file, 'utf-8')),
  }));

  // Validate all scripts
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const validationErrors = validateAllScripts(parsedScripts, packageJsonPath);

  if (validationErrors.length > 0) {
    console.error('Script validation errors:');
    validationErrors.forEach(({ message }) => {
      console.error(`- ${message}`);
    });
  }

  // Process scripts into package.json format
  const scripts: Record<string, string> = {};
  const scriptDocs: Record<
    string,
    { description?: string; group?: string }
  > = {};

  parsedScripts.forEach(({ data }) => {
    if (Array.isArray(data)) {
      data.forEach((script) => processScript(script, scripts, scriptDocs));
    } else {
      processScript(data, scripts, scriptDocs);
    }
  });

  // Generate and write files even if there were errors
  const outputJson = generatePackageJson(scripts);

  const outputPath = path.join(
    __dirname,
    '..',
    'package-scripts',
    'package.json'
  );

  // Force write new package.json
  fs.writeFileSync(outputPath, outputJson, { flag: 'w' });

  const docsPath = path.join(
    __dirname,
    '..',
    'package-scripts',
    'scripts-docs.json'
  );

  // Force write new docs
  fs.writeFileSync(docsPath, JSON.stringify(scriptDocs, null, 2), {
    flag: 'w',
  });

  console.log('Successfully updated package.json and scripts-docs.json');

  // Exit with error if there were validation issues
  if (validationErrors.length > 0) {
    process.exit(1);
  }
}

function processScript(
  scriptData: ScriptFile,
  scripts: Record<string, string>,
  scriptDocs: Record<
    string,
    { longName?: string; description?: string; group?: string }
  >
) {
  // Process commands - handle both single command and commands array
  let processedCommands: string[];

  if (scriptData.command) {
    // Single command case
    processedCommands = [wrapCommand({ command: scriptData.command })];
  } else if (scriptData.commands) {
    // Multiple commands case
    processedCommands = scriptData.commands.map((cmd) => wrapCommand(cmd));
  } else {
    throw new Error(
      `Script ${scriptData.name} must have either 'command' or 'commands' field`
    );
  }

  scripts[scriptData.name] = processedCommands.join(' && ');

  // Store documentation info
  if (scriptData.longName || scriptData.description || scriptData.group) {
    scriptDocs[scriptData.name] = {
      longName: scriptData.longName,
      description: scriptData.description,
      group: scriptData.group,
    };
  }
}

main().catch(console.error);
