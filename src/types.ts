export interface CommandConfig {
  command: string;
  node?: number;
  env?: Record<string, string | boolean | number>;
  "env-file"?: string;
  args?: Record<string, string | boolean | number>;
}

export interface ScriptFile {
  name: string;
  longName?: string;
  description?: string;
  group?: string;
  command?: string;
  commands?: (CommandConfig | string)[];
  node?: number;
  env?: Record<string, string | boolean | number>;
  args?: Record<string, string | boolean | number>;
}

export interface ScriptFileWrapper {
  scripts: ScriptFile[];
}
