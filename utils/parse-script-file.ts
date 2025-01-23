import * as yaml from 'yaml';
import { ScriptFile, CommandConfig } from '../types';

export function parseScriptFile(content: string): ScriptFile | ScriptFile[] {
  try {
    const parsed = yaml.parse(content);

    // Handle bulk scripts file
    if (parsed.scripts && Array.isArray(parsed.scripts)) {
      return parsed.scripts.map((script) => {
        if (!script.name) {
          throw new Error('Each script must contain a "name" field');
        }

        // Handle single command case
        if (script.command) {
          const commandConfig: CommandConfig = {
            command: script.command,
            args: script.args,
            env: script.env,
            node: script.node,
          };

          const { command, args, env, node, ...metadata } = script;
          return {
            ...metadata,
            commands: [commandConfig],
          };
        }

        // Handle commands array case
        if (script.commands) {
          return {
            ...script,
            commands: script.commands.map((cmd: any) => {
              if (typeof cmd === 'string') {
                return { command: cmd };
              }
              return cmd;
            }),
          };
        }

        throw new Error(
          `Script ${script.name} must have either 'command' or 'commands' field`
        );
      });
    }

    // Handle single script file
    if (!parsed.name) {
      throw new Error('Script file must contain "name" field');
    }

    // Handle single command case
    if (parsed.command) {
      const commandConfig: CommandConfig = {
        command: parsed.command,
        args: parsed.args,
        env: parsed.env,
        node: parsed.node,
      };

      const { command, args, env, node, ...metadata } = parsed;
      return {
        ...metadata,
        commands: [commandConfig],
      };
    }

    // Handle commands array case
    if (parsed.commands) {
      return {
        ...parsed,
        commands: parsed.commands.map((cmd: any) => {
          if (typeof cmd === 'string') {
            return { command: cmd };
          }
          return cmd;
        }),
      };
    }

    throw new Error(
      `Script ${parsed.name} must have either 'command' or 'commands' field`
    );
  } catch (err) {
    throw new Error(`Failed to parse script file: ${err.message}`);
  }
}
