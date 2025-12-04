// Spawned as a subprocess by runner.ts
// Can be killed if it gets stuck in an infinite loop

import chalk from "chalk";
import * as readline from "readline";

const [dayFilePath, puzzleInput, dayNum, sessionKey] = Bun.argv.slice(2);

if (!dayFilePath || !puzzleInput || !dayNum || !sessionKey) {
  console.error("Missing arguments");
  process.exit(1);
}

const dayIndex = parseInt(dayNum) - 1;

// Types
type Test = { input: string; expected: unknown };
type Part = { tests: Test[]; solution: (input: string) => unknown };
type Run = { part1: Part; part2: Part; onlyTests: boolean };

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

type SolutionResult = { part: 1 | 2; answer: string; timeMs: number };

// Results persistence
const RESULTS_PATH = "results.json";

async function loadResults(): Promise<Results> {
  const file = Bun.file(RESULTS_PATH);
  if (!(await file.exists())) {
    console.error(chalk.red("results.json not found. Run runner.ts first."));
    process.exit(1);
  }
  return file.json();
}

async function saveResults(results: Results): Promise<void> {
  await Bun.write(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");
}

function getPartResult(
  results: Results,
  dayIdx: number,
  part: 1 | 2,
): PartResult {
  // Ensure day exists
  while (results.days.length <= dayIdx) {
    results.days.push({
      part1: { result: null, attempts: [], time: null },
      part2: { result: null, attempts: [], time: null },
    });
  }
  return part === 1 ? results.days[dayIdx]!.part1 : results.days[dayIdx]!.part2;
}

// Answer submission
async function submitAnswer(
  part: 1 | 2,
  answer: string,
  timeMs: number,
): Promise<void> {
  const results = await loadResults();
  const partResult = getPartResult(results, dayIndex, part);

  if (partResult.result !== null) {
    console.log(
      chalk.yellow(
        `\n⚠ Part ${part} already solved with: ${partResult.result}`,
      ),
    );
    return;
  }

  if (partResult.attempts.includes(answer)) {
    console.log(
      chalk.yellow(`\n⚠ Already tried "${answer}" - it was incorrect`),
    );
    return;
  }

  console.log(chalk.cyan(`\nSubmitting Part ${part} answer: ${answer}...`));

  const response = await fetch(
    `https://adventofcode.com/${results.year}/day/${dayNum}/answer`,
    {
      method: "POST",
      headers: {
        Cookie: `session=${sessionKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `level=${part}&answer=${encodeURIComponent(answer)}`,
    },
  );

  const html = await response.text();
  const roundedTime = parseFloat(timeMs.toPrecision(3));

  if (html.includes("That's the right answer")) {
    console.log(chalk.green.bold("✓ Correct!"));
    partResult.result = answer;
    partResult.time = roundedTime;
    await saveResults(results);
  } else if (html.includes("That's not the right answer")) {
    console.log(chalk.red.bold("✗ Wrong answer"));
    if (html.includes("too high")) {
      console.log(chalk.yellow("  Hint: Your answer is too high"));
    } else if (html.includes("too low")) {
      console.log(chalk.yellow("  Hint: Your answer is too low"));
    }
    partResult.attempts.push(answer);
    await saveResults(results);
  } else if (html.includes("You gave an answer too recently")) {
    const match = html.match(/You have (?:(\d+)m )?(\d+)s left to wait/);
    const minutes = match?.[1];
    const seconds = match?.[2];
    let waitTime = "some time";
    if (minutes && seconds) {
      waitTime = `${minutes}m ${seconds}s`;
    } else if (seconds) {
      waitTime = `${seconds}s`;
    }
    console.log(
      chalk.yellow(
        `⏳ Rate limited. Wait ${waitTime} before submitting again.`,
      ),
    );
  } else if (html.includes("Did you already complete it")) {
    console.log(chalk.yellow("⚠ Already completed this part"));
    if (partResult.result === null) {
      partResult.result = answer;
      partResult.time = roundedTime;
      await saveResults(results);
    }
  } else {
    console.log(chalk.yellow("Unknown response from server"));
  }
}

// Interactive prompt
function promptForSubmit(
  rl: readline.Interface,
  solutionResults: SolutionResult[],
) {
  if (solutionResults.length === 0) {
    rl.question("", () => {
      promptForSubmit(rl, solutionResults);
    });
    return;
  }

  const options = solutionResults.map((r) => r.part).join("/");
  rl.question(chalk.cyan(`\nSubmit answer? [${options}]: `), async (input) => {
    const choice = input.trim().toLowerCase();
    if (choice === "") {
      promptForSubmit(rl, solutionResults);
      return;
    }

    const partNum = parseInt(choice);
    const result = solutionResults.find((r) => r.part === partNum);
    if (result) {
      await submitAnswer(result.part, result.answer, result.timeMs);
    } else {
      console.log(chalk.red("Invalid choice"));
    }

    promptForSubmit(rl, solutionResults);
  });
}

// Main execution
const solutionResults: SolutionResult[] = [];

try {
  const module = await import(`./${dayFilePath}?t=${Date.now()}`);
  const run: Run = module.run;

  for (const partName of ["part1", "part2"] as const) {
    const part = run[partName];
    const partNum = partName === "part1" ? 1 : 2;
    console.log(chalk.yellow.bold(`--- Part ${partNum} ---`));

    // Run tests
    if (part.tests.length > 0) {
      for (let i = 0; i < part.tests.length; i++) {
        const test = part.tests[i]!;
        const result = part.solution(test.input);
        const passed = result === test.expected;
        if (passed) {
          console.log(chalk.green(`  ✓ Test ${i + 1}: Passed`));
        } else {
          console.log(chalk.red(`  ✗ Test ${i + 1}: Failed`));
          console.log(`    ${chalk.dim("Expected:")} ${test.expected}`);
          console.log(
            `    ${chalk.dim("Got:     ")} ${chalk.red(String(result))}`,
          );
        }
      }
    } else {
      console.log(chalk.dim("  No tests defined"));
    }

    // Run solution on puzzle input
    if (!run.onlyTests) {
      const start = performance.now();
      const result = part.solution(puzzleInput);
      const timeMs = performance.now() - start;
      console.log(
        `  ${chalk.magenta.bold("Result:")} ${chalk.bold(String(result))} ${chalk.dim(`(${timeMs.toFixed(2)}ms)`)}`,
      );

      if (result !== undefined && result !== null) {
        solutionResults.push({
          part: partNum as 1 | 2,
          answer: String(result),
          timeMs,
        });
      }
    }
    console.log();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  promptForSubmit(rl, solutionResults);
} catch (error) {
  console.error(chalk.red("Error running solutions:"), error);
}
