import { CommandConfig } from '../types';

export function wrapCommand({
  command,
  node,
  env,
  args,
}: CommandConfig): string {
  let finalCommand = command;

  // Add command arguments
  if (args && Object.keys(args).length > 0) {
    const argsString = Object.entries(args)
      .map(([key, value]) => {
        // If value is true, just add the flag
        if (value === true) {
          return `--${key}`;
        }
        // If value is an array, add each item as a separate argument
        if (Array.isArray(value)) {
          const result = `--${key} ${value.join(` --${key} `)}`;
          return result;
        }
        // Otherwise add key=value or key value depending on the flag
        const result = `--${key} ${value}`;
        return result;
      })
      .join(' ');

    finalCommand = `${finalCommand} ${argsString}`;
  }

  // Add environment variables
  if (env && Object.keys(env).length > 0) {
    const envString = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    finalCommand = `cross-env ${envString} ${finalCommand}`;
  }

  // Add node version wrapper
  if (node) {
    finalCommand = `n exec ${node} ${finalCommand}`;
  }

  return finalCommand;
}
