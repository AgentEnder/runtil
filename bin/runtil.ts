#!/usr/bin/env node
import { CommandModule } from "yargs";
import yargs from "yargs/yargs";

import {
  runUntil,
  RunUntilOptions,
  RunUntilTargetStringNotFoundError,
} from "../src/run-until";

const sep = process.argv.findIndex((el) => el === "--");

const internalArgs = process.argv.slice(2, sep);
const commandArgs = process.argv.slice(sep + 1);

const yargsCommand: CommandModule<{}, RunUntilOptions> = {
  command: "$0",
  describe: "Runs a command until a certain string is found in the output.",
  builder: (yargs) =>
    yargs
      .option("targetString", {
        type: "string",
        describe: "String to search for in the output of the command",
        required: true,
      })
      .option("silent", {
        type: "boolean",
        describe: "Whether to suppress output from the command",
        default: false,
      })
      .option("leaveAlive", {
        type: "boolean",
        describe:
          "Whether to leave the command running after the target string is found",
        default: false,
      }),
  handler: async (opts) => {
    try {
      await runUntil(opts, commandArgs[0], ...commandArgs.slice(1));
      process.exit(0);
    } catch (e) {
      if (e instanceof RunUntilTargetStringNotFoundError) {
        process.exit(e.exitCode && e.exitCode > 0 ? e.exitCode : 1);
      } else {
        process.exit(1);
      }
    }
  },
};

yargs(internalArgs)
  .parserConfiguration({
    "strip-dashed": true,
  })
  .command(yargsCommand).argv;
