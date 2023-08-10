# RunTil

RunTil is a simple command line tool that runs a command until a target string is found in the output. If the child process exits before finding the target string, runtil will exit with the same code as the child process unless it would be 0, in which case runtil will exit with 1 to indicate a failing state.

There are a few use cases for something like this:

- Troubleshooting e2e tests, where a later test may overwrite the state of a previous test on disk that you need to be able to debug a failure
- Starting a service in the background and waiting for it to be ready to accept connections before proceeding with the next step in a script

## Usage

### Basic Usage

This is useful when you need to debug a state on disk after a test failure, especially if a later test may overwrite the state. There are other use cases, but the important bit is that the command will be killed once the target string has been found.

```shell
> npx runtil --target-string "Error: test failed" -- npx jest
```

### Leave Alive

Sometimes you may want to execute more commands after the first command has output a certain string, but leave the first command running in the background. A common example may be running e2e tests or another process that depends on a background server. Passing `--leave-alive` to `runtil` tells it to detach from the child process and leave it alive once the target string is found.

```shell
> npx runtil --target-string --leave-alive "Server is listening" -- node server.js --port 3000 && curl http://localhost:3000
```

## Programmatic API

`runtil` exports its backing mechanism via a promise based function. It can be used in the following manners:

```typescript
import { runUntil } from "runtil";

// Start the server, then kill it after it starts listening
await runUntil("Server is listening", ["node", "server.js", "--port", "3000"]);

// Start the server and leave it running, but resolves once it starts listening so
// the next lines can be ran
await runUntil({ targetString: "Server is listening", leaveAlive: true }, [
  "node",
  "server.js",
  "--port",
  "3000",
]);

// Start the server and leave it running, but resolves once it starts listening so
// the next lines can be ran, without printing any output from the child process
await runUntil(
  { targetString: "Server is listening", leaveAlive: true, silent: true },
  ["node", "server.js", "--port", "3000"]
);
```

## In Repo Examples

In this repo there are a few example JS files to play with. You can run `runtil` via the `npm run cli` script. The examples look like:

### Long Running Task

Write the first 3 files to disk, and then exit.

```shell
> npm run cli -- --target-string "Writing file 2" -- node ./examples/long-task
```

Write all 10 files to disk, but after the first 3 files exit with code 0

```shell
> npm run cli -- --target-string "Writing file 2" --leave-alive -- node ./examples/long-task
```

### Server

Start a server on port 3000, and then hit it with curl.

```shell
> npm run cli -- --target-string "Server is listening" --leave-alive -- node ./examples/server && curl http://localhost:3000
```
