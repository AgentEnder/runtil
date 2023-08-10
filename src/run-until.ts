import { fork, spawn } from "node:child_process";
import EventEmitter from "node:events";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const listeners: Map<
  EventEmitter,
  Map<string | symbol, NodeJS.SignalsListener[]>
> = new Map();

export type RunUntilOptions = {
  targetString: string;
  silent?: boolean;
  leaveAlive?: boolean;
};

/**
 * Run a command until a certain string is found in the output.
 * @param opts Options object containing targetString and other options.
 * @param command Command to run.
 * @param args Arguments to pass to the command.
 */
export function runUntil(
  opts: RunUntilOptions,
  command: string,
  ...args: string[]
): Promise<void>;

/**
 * Run a command until a certain string is found in the output.
 * @param targetString String to search for in the output of the command.
 * @param command Command to run.
 * @param args Arguments to pass to the command.
 */
export function runUntil(
  targetString: string,
  command: string,
  ...args: string[]
): Promise<void>;

export function runUntil(
  optsOrTargetString: string | RunUntilOptions,
  command: string,
  ...args: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const opts =
      typeof optsOrTargetString === "string"
        ? { targetString: optsOrTargetString }
        : optsOrTargetString;

    const child = fork(
      join(__dirname, "forked-process.js"),
      [command, ...args],
      {
        detached: true,
        stdio: "pipe",
        env: {
          ...process.env,
          RUN_UNTIL_TARGET_STRING: opts.targetString,
          RUN_UNTIL_SILENT: opts.silent ? "true" : undefined,
          RUN_UNTIL_LEAVE_ALIVE: opts.leaveAlive ? "true" : undefined,
        },
      }
    );

    const cleanupChildProcess = () => {
      if (opts.leaveAlive) {
        child.removeAllListeners();
        child.stdout?.unpipe();
        child.stderr?.unpipe();
        child.stdout?.destroy();
        child.stderr?.destroy();
        child.stdin?.end();
        child.stdin?.destroy();
        child.unref();
      } else {
        child.kill();
      }
    };

    const getDataHandler = (log: (d: Buffer) => void) => (data: Buffer) => {
      if (!opts.silent) {
        log(data);
      }
      if (data.includes(opts.targetString)) {
        cleanupChildProcess();
        cleanupListeners();
        resolve();
      }
    };

    child.stdout!.on(
      "data",
      getDataHandler((buf) => {
        process.stdout.write(buf);
      })
    );
    child.stderr!.on(
      "data",
      getDataHandler((buf) => {
        process.stderr.write(buf);
      })
    );

    const exitHandler = () => {
      child.kill();
    };
    addListener(process, "exit", exitHandler);
    addListener(process, "SIGINT", exitHandler);
    addListener(process, "SIGTERM", exitHandler);

    const onChildExitHandler = (code: number) => {
      process.removeAllListeners();
      reject(new RunUntilTargetStringNotFoundError(opts.targetString, code));
    };
    child.on("exit", onChildExitHandler);
    child.on("SIGINT", onChildExitHandler);
    child.on("SIGTERM", onChildExitHandler);

    child.on("uncaughtException", (err) => {
      cleanupChildProcess();
      cleanupListeners();
      reject(err);
    });
  });
}

function addListener<T extends EventEmitter, K extends any>(
  emitter: T,
  event: string | symbol,
  listener: (...args: unknown[]) => void
) {
  emitter.on(event, listener);
  const objListenters =
    listeners.get(emitter) ??
    new Map<string | symbol, NodeJS.SignalsListener[]>();
  const objEventListeners = objListenters?.get(event) ?? [];
  objEventListeners.push(listener);
  if (!listeners.has(emitter)) {
    listeners.set(emitter, objListenters);
  }
  if (!objListenters.has(event)) {
    objListenters.set(event, objEventListeners);
  }
}

function cleanupListeners() {
  for (const [emitter, emitterListeners] of listeners.entries()) {
    for (const [event, eventListeners] of emitterListeners.entries()) {
      for (const l of eventListeners) emitter.removeListener(event, l);
    }
  }
}

export class RunUntilTargetStringNotFoundError extends Error {
  constructor(targetString: string, public exitCode?: number) {
    super(`Target string was not found while running the command.`);
  }
}
