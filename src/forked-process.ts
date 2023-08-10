import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

if (!process.env.RUN_UNTIL_TARGET_STRING) {
  throw new Error("RUN_UNTIL_TARGET_STRING environment variable not set");
}

const [command, ...args] = process.argv.slice(2);

const child = spawn(command, args, {
  shell: true,
});

const cleanupChildProcess = () => {
  child.kill();
};

child.stdout.on("data", (buf) => {
  try {
    if (process.stdout.writable) {
      process.stdout.write(buf);
    } else {
      writeFileSync("stdout.txt", buf);
    }
  } catch (e) {}
});
child.stderr.on("data", (buf) => {
  try {
    process.stderr.write(buf);
  } catch (e) {}
});

const exitHandler = (code: number) => {
  cleanupChildProcess();
  process.exit(code);
};
process.on("exit", exitHandler);
process.on("SIGINT", exitHandler);
process.on("SIGTERM", exitHandler);

const onChildExitHandler = (code: number) => {
  process.exit(code);
};
child.on("exit", onChildExitHandler);
child.on("SIGINT", onChildExitHandler);
child.on("SIGTERM", onChildExitHandler);

process.on("uncaughtException", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") {
    return;
  }
  throw err;
});
