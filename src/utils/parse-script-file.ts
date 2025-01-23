import * as yaml from "yaml";
import { ScriptFile } from "../types.js";

export function parseScriptFile(content: string): ScriptFile | ScriptFile[] {
  try {
    const parsed = yaml.parse(content);
    return parsed;
  } catch (error) {
    console.error("Error parsing YAML file:", error);
    throw error;
  }
}
