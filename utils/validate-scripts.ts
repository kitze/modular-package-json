import fs from 'fs';
import { ScriptFile } from '../types';

type ValidationError = {
  file: string;
  script: string;
  command: string;
  message: string;
};

const PACKAGE_MANAGERS = ['yarn', 'npm', 'pnpm', 'bun'];
const COMMON_CLI_COMMANDS = new Set([
  'node',
  'rm',
  'cp',
  'mv',
  'echo',
  'open',
  'n',
  'sed',
  'webpack',
  'vite',
  'turbo',
  'cross-env',
  'electron-builder',
  'storybook',
]);

function getShortPath(fullPath: string): string {
  return fullPath.split('/').slice(-2).join('/');
}

export function validateScriptFile(
  scriptFile: ScriptFile,
  filePath: string,
  availableScripts: Set<string>,
  installedPackages: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const shortPath = getShortPath(filePath);

  // Get the raw command(s)
  const commands = scriptFile.command
    ? [scriptFile.command]
    : scriptFile.commands?.map((cmd) =>
        typeof cmd === 'string' ? cmd : cmd.command
      ) || [];

  for (const command of commands) {
    // Match commands that start with a package manager
    const packageManagerCommands = PACKAGE_MANAGERS.flatMap((pm) => {
      const matches =
        command.match(new RegExp(`${pm}\\s+([a-zA-Z0-9:_-]+)`, 'g')) || [];
      return matches.map((match) => ({
        fullCommand: match,
        packageManager: pm,
        script: match.replace(`${pm} `, ''),
      }));
    });

    // Validate script references
    for (const { fullCommand, script } of packageManagerCommands) {
      // Skip if it's an installed package
      if (installedPackages.has(script)) continue;

      if (!availableScripts.has(script)) {
        errors.push({
          file: filePath,
          script: scriptFile.name,
          command: fullCommand,
          message: `Script "${scriptFile.name}" in "${shortPath}" references non-existent script "${script}"`,
        });
      }
    }

    // Check other commands (for warnings only)
    const directCommands = command.match(/^([a-zA-Z0-9:_-]+)\s/gm) || [];
    for (const directCommand of directCommands) {
      const cmd = directCommand.trim();

      if (PACKAGE_MANAGERS.includes(cmd)) continue;
      if (COMMON_CLI_COMMANDS.has(cmd)) continue;
      if (installedPackages.has(cmd)) continue;
      if (availableScripts.has(cmd)) continue;

      console.warn(
        `Warning: Script "${scriptFile.name}" in "${shortPath}" uses unknown command "${cmd}"`
      );
    }
  }

  return errors;
}

export function validateAllScripts(
  scriptFiles: { file: string; data: ScriptFile | ScriptFile[] }[],
  packageJsonPath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // First collect all script names
  const availableScripts = new Set<string>();
  scriptFiles.forEach(({ data }) => {
    if (Array.isArray(data)) {
      data.forEach((script) => availableScripts.add(script.name));
    } else {
      availableScripts.add(data.name);
    }
  });

  // Get installed packages
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const installedPackages = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
  ]);

  // Validate each script
  scriptFiles.forEach(({ file, data }) => {
    if (Array.isArray(data)) {
      data.forEach((script) => {
        errors.push(
          ...validateScriptFile(
            script,
            file,
            availableScripts,
            installedPackages
          )
        );
      });
    } else {
      errors.push(
        ...validateScriptFile(data, file, availableScripts, installedPackages)
      );
    }
  });

  return errors;
}
