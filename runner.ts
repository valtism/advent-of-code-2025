import type { Subprocess } from "bun";
import chalk from "chalk";
import { watch } from "fs";
import { selectFromList } from "./cli";

const resultsPath = "results.json";
const envPath = ".env";

async function getSessionKey(): Promise<string> {
  const envFile = Bun.file(envPath);

  // Check if .env exists and has the session key
  if (await envFile.exists()) {
    const content = await envFile.text();
    const match = content.match(/^AOC_SESSION_KEY=(.+)$/m);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Prompt user for session key
  console.log(chalk.yellow("\n🎄 AOC Session Key Required\n"));
  console.log(
    "To download puzzle inputs, you need your Advent of Code session cookie.\n",
  );
  console.log(chalk.cyan("How to get your session key:"));
  console.log("  1. Go to https://adventofcode.com and log in");
  console.log("  2. Open your browser's Developer Tools (F12)");
  console.log("  3. Go to Application → Cookies → https://adventofcode.com");
  console.log("  4. Find the cookie named 'session' and copy its value\n");

  process.stdout.write(chalk.green("Paste your session key: "));

  const sessionKey = await new Promise<string>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });

  if (!sessionKey) {
    console.error(chalk.red("\nNo session key provided. Exiting."));
    process.exit(1);
  }

  // Save to .env file
  const envContent = `AOC_SESSION_KEY=${sessionKey}\n`;
  await Bun.write(envPath, envContent);
  console.log(chalk.green(`\n✓ Session key saved to ${envPath}\n`));

  return sessionKey;
}

const aocStartYear = 2015;

type PartResult = {
  result: string | null;
  attempts: string[];
  time: number | null;
};

type DayResult = {
  part1: PartResult;
  part2: PartResult;
};

type Results = {
  year: number;
  days: DayResult[];
};

function getMaxDays(year: number): number {
  // 2025 onwards is still in progress, only 12 days so far
  // This should be updated as more days are released
  return year >= 2025 ? 12 : 25;
}

async function getOrCreateResults(): Promise<Results> {
  const resultsFile = Bun.file(resultsPath);

  if (await resultsFile.exists()) {
    return resultsFile.json();
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - aocStartYear + 1 },
    (_, i) => aocStartYear + i,
  );

  const year = await selectFromList(
    "Select Advent of Code year:",
    years,
    years.length - 1,
    (y, selected) =>
      selected ? chalk.cyan.bold(`  ▸ ${y}`) : chalk.dim(`    ${y}`),
  );

  const results: Results = { year, days: [] };
  await Bun.write(resultsPath, JSON.stringify(results, null, 2) + "\n");
  console.log(chalk.green(`Created ${resultsPath} for year ${year}`));

  return results;
}

function getDefaultDayIndex(results: Results): number {
  const maxDays = getMaxDays(results.year);

  // Find the first day that isn't fully completed (both parts solved)
  for (let i = 0; i < results.days.length; i++) {
    const day = results.days[i];
    if (!day || day.part1.result === null || day.part2.result === null) {
      return i;
    }
  }

  // If all existing days are complete, default to the next day (or last available)
  return Math.min(results.days.length, maxDays - 1);
}

async function selectDay(results: Results): Promise<number> {
  const maxDays = getMaxDays(results.year);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);
  const defaultIndex = getDefaultDayIndex(results);

  const day = await selectFromList(
    `Select day (${results.year}):`,
    days,
    defaultIndex,
    (d, selected) => {
      const dayResult = results.days[d - 1];
      const part1Done = !!dayResult?.part1.result;
      const part2Done = !!dayResult?.part2.result;

      let status = "";
      if (part1Done && part2Done) {
        status = chalk.yellow(" ★★");
      } else if (part1Done) {
        status = chalk.yellow(" ★") + chalk.dim("☆");
      } else {
        status = chalk.dim(" ☆☆");
      }

      const dayStr = d.toString().padStart(2, " ");
      return selected
        ? chalk.cyan.bold(`  ▸ Day ${dayStr}${status}`)
        : chalk.dim(`    Day ${dayStr}`) + status;
    },
  );

  return day;
}

// Get session key upfront (before any interactive prompts that might conflict)
const sessionKey = await getSessionKey();

const results = await getOrCreateResults();
const aocYear = results.year;
const dayNum = await selectDay(results);

// Give stdin time to reset after interactive selection
await Bun.sleep(50);

const dayStr = dayNum.toString().padStart(2, "0");
const dayFilePath = `src/day${dayStr}.ts`;
const inputFilePath = `src/day${dayStr}-input.txt`;

// Fetch puzzle input if it doesn't exist
const inputFile = Bun.file(inputFilePath);
if (!(await inputFile.exists())) {
  const response = await fetch(
    `https://adventofcode.com/${aocYear}/day/${dayNum}/input`,
    { headers: { Cookie: `session=${sessionKey}` } },
  );

  if (!response.ok) {
    console.error(
      `Failed to fetch input: ${response.status} ${response.statusText}`,
    );
    process.exit(1);
  }

  await Bun.write(inputFile, await response.text());
  console.log(`Downloaded input to ${inputFilePath}`);
} else {
  console.log(`${inputFilePath} already exists.`);
}

// Create day file from template if it doesn't exist
const dayFile = Bun.file(dayFilePath);
if (!(await dayFile.exists())) {
  const template = await Bun.file("template.ts").text();
  await Bun.write(dayFile, template);
  console.log(`Created ${dayFilePath} from template.`);
} else {
  console.log(`${dayFilePath} already exists.`);
}

const puzzleInput = await Bun.file(inputFilePath).text();

let currentProcess: Subprocess | null = null;

function runSolutions() {
  if (currentProcess) {
    currentProcess.kill();
    currentProcess = null;
  }

  console.clear();
  console.log(`\n${chalk.cyan.bold("-".repeat(32))}`);
  console.log(chalk.cyan.bold(`  Advent of Code ${aocYear} - Day ${dayNum}`));
  console.log(`${chalk.cyan.bold("-".repeat(32))}\n`);

  currentProcess = Bun.spawn(
    [
      "bun",
      "run",
      "solution-runner.ts",
      dayFilePath,
      puzzleInput,
      String(dayNum),
      sessionKey,
    ],
    {
      stdin: "pipe",
      stdout: "inherit",
      stderr: "inherit",
      onExit: () => {
        currentProcess = null;
      },
    },
  );
}

// Forward stdin to subprocess
process.stdin.resume();
process.stdin.on("data", (data) => {
  if (currentProcess?.stdin && typeof currentProcess.stdin === "object") {
    currentProcess.stdin.write(data);
  }
});

// Initial run
runSolutions();

watch(dayFilePath, runSolutions);
