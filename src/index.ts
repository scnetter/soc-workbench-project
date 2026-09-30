/**
 * SOC Analyst Workbench Entry Point
 */
import { startRepl, printHelp, printVersion } from "./repl.js";

export { startRepl, printHelp, printVersion };

if (import.meta.main) {
  startRepl();
}

