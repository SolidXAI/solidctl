import { env } from "../adapters/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = env("SOLIDX_ENV", "prod") === "dev";

function shouldLog(level: LogLevel) {
  if (!isDev && level === "debug") return false;
  return true;
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (!shouldLog("debug")) return;
    // eslint-disable-next-line no-console
    console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (!shouldLog("info")) return;
    // eslint-disable-next-line no-console
    console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (!shouldLog("warn")) return;
    // eslint-disable-next-line no-console
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (!shouldLog("error")) return;
    // eslint-disable-next-line no-console
    console.error(...args);
  },
};
