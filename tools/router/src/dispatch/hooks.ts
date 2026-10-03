import { pathToFileURL } from "node:url";
import { isAbsolute, resolve } from "node:path";

/**
 * Lifecycle hook runner. A hook is an ESM file that default-exports either
 * a function or an object with an `onEvent` method. The dispatcher invokes
 * hooks at beforeTriage / afterDispatch / onEscalation points, passing a
 * payload object that includes the event name.
 *
 * Hooks run in-process via dynamic import. They share the same module cache
 * so repeated invocations don't re-parse the file. Errors are the caller's
 * concern — this module just throws on failure and leaves logging to the
 * dispatcher.
 */

export interface HookPayload {
  event: "beforeTriage" | "afterDispatch" | "onEscalation";
  [key: string]: unknown;
}

type HookFn = (payload: HookPayload) => void | Promise<void>;
type HookModule = HookFn | { default?: HookFn; onEvent?: HookFn };

const cache = new Map<string, HookFn>();

export async function runHook(
  hookPath: string,
  payload: HookPayload,
): Promise<void> {
  const fn = await loadHook(hookPath);
  await fn(payload);
}

async function loadHook(hookPath: string): Promise<HookFn> {
  const absolute = isAbsolute(hookPath)
    ? hookPath
    : resolve(process.cwd(), hookPath);
  const key = absolute;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = pathToFileURL(absolute).href;
  const mod = (await import(url)) as HookModule;

  let fn: HookFn | undefined;
  if (typeof mod === "function") {
    fn = mod;
  } else if (typeof (mod as { default?: HookFn }).default === "function") {
    fn = (mod as { default: HookFn }).default;
  } else if (typeof (mod as { onEvent?: HookFn }).onEvent === "function") {
    fn = (mod as { onEvent: HookFn }).onEvent;
  }

  if (!fn) {
    throw new Error(
      `Hook at ${hookPath} does not export a function or an { onEvent } object.`,
    );
  }
  cache.set(key, fn);
  return fn;
}
