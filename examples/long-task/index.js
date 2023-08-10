const { rmSync, writeFileSync, mkdirSync, existsSync } = require("fs");
const { join } = require("node:path");

// An example of a long-running task that can be used to test the package.
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const TMP_DIR = join(__dirname, "tmp");

async function longTask() {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });
  for (let i = 0; i < 10; i++) {
    console.log("Writing file " + i.toString());
    writeFileSync(join(TMP_DIR, `${i}.txt`), `This is file ${i}.`);
    await sleep(1000);
  }
}

longTask();
