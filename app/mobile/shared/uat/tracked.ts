import { isRecording, logAppEvent } from "./recorder";

/**
 * Wraps an async action so that, during a UAT session, its outcome is logged
 * as an app event: `{ name, ok, ms, ...args, ...result }` or `{ ..., error }`.
 * Outside a session (and in release builds) it only adds one boolean check.
 *
 * Only pass non-personal details in `args`/`result` (no typed text).
 */
export function tracked<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
  describe: {
    args?: (args: A) => Record<string, unknown>;
    result?: (result: R) => Record<string, unknown>;
  } = {},
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    if (!__DEV__ || !isRecording()) return fn(...args);
    const started = Date.now();
    const argInfo = safe(() => describe.args?.(args));
    try {
      const result = await fn(...args);
      logAppEvent(name, {
        ok: true,
        ms: Date.now() - started,
        ...argInfo,
        ...safe(() => describe.result?.(result)),
      });
      return result;
    } catch (e) {
      logAppEvent(name, {
        ok: false,
        ms: Date.now() - started,
        ...argInfo,
        error: (e as Error)?.message ?? String(e),
      });
      throw e;
    }
  };
}

function safe(f: () => Record<string, unknown> | undefined) {
  try {
    return f() ?? {};
  } catch {
    return {};
  }
}
