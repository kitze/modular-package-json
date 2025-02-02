export interface CommandConfig {
  command: string;
  node?: number;
  env?: Record<string, string | boolean | number>;
  args?: Record<string, string | boolean | number>;
}

export interface ScriptFile {
  name: string;
  longName?: string;
  description?: string;
  group?: string;
  command?: string; // Single command
  commands?: CommandConfig[] | string[]; // Multiple commands
}
