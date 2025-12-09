import { Logger } from "./types";

export class ConsoleLogger implements Logger {
  constructor(private readonly debugEnabled = false) {}

  debug = (...args: unknown[]) => {
    if (this.debugEnabled) {
      console.debug("[sevenrooms][debug]", ...args);
    }
  };

  info = (...args: unknown[]) => {
    console.info("[sevenrooms]", ...args);
  };

  warn = (...args: unknown[]) => {
    console.warn("[sevenrooms][warn]", ...args);
  };

  error = (...args: unknown[]) => {
    console.error("[sevenrooms][error]", ...args);
  };
}

export const resolveLogger = (logger?: Logger, debugEnabled?: boolean): Logger => {
  if (logger) {
    return logger;
  }
  return new ConsoleLogger(debugEnabled);
};
