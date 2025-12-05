// Spawned as a subprocess by SolutionRunner component
// Communicates via JSON lines on stdout/stdin
// Can be killed if it gets stuck in an infinite loop

import type {
  SubprocessMessage,
  ToSubprocessMessage,
  Results,
  SolutionResult,
} from "../ui/types";

const [dayFilePath, puzzleInput, dayNum, sessionKey] = Bun.argv.slice(2);

if (!dayFilePath || !puzzleInput || !dayNum || !sessionKey) {
  send({ type: "error", message: "Missing arguments" });
  process.exit(1);
}

const dayIndex = parseInt(dayNum) - 1;

// Types for solution modules
type Test = { input: string; expected: unknown };
type Part = { tests: Test[]; solution: (input: string) => unknown };
type Run = { part1: Part; part2: Part; onlyTests: boolean };

// Results persistence
const RESULTS_PATH = "results.json";

function send(message: SubprocessMessage): void {
  console.log(JSON.stringify(message));
}

function output(text: string): void {
  send({ type: "output", text });
}

async function loadResults(): Promise<Results> {
  const file = Bun.file(RESULTS_PATH);
  if (!(await file.exists())) {
    send({ type: "error", message: "results.json not found" });
    process.exit(1);
  }
  return file.json();
}

async function saveResults(results: Results): Promise<void> {
  await Bun.write(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");
}

function getPartResult(results: Results, dayIdx: number, part: 1 | 2) {
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
  timeMs: number
): Promise<void> {
  const results = await loadResults();
  const partResult = getPartResult(results, dayIndex, part);

  if (partResult.result !== null) {
    send({
      type: "submit_response",
      part,
      success: false,
      message: `Part ${part} already solved with: ${partResult.result}`,
    });
    return;
  }

  if (partResult.attempts.includes(answer)) {
    send({
      type: "submit_response",
      part,
      success: false,
      message: `Already tried "${answer}" - it was incorrect`,
    });
    return;
  }

  output(`Submitting Part ${part} answer: ${answer}...`);

  const response = await fetch(
    `https://adventofcode.com/${results.year}/day/${dayNum}/answer`,
    {
      method: "POST",
      headers: {
        Cookie: `session=${sessionKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `level=${part}&answer=${encodeURIComponent(answer)}`,
    }
  );

  const html = await response.text();
  const roundedTime = parseFloat(timeMs.toPrecision(3));

  if (html.includes("That's the right answer")) {
    partResult.result = answer;
    partResult.time = roundedTime;
    await saveResults(results);
    send({ type: "submit_response", part, success: true, message: "Correct!" });
  } else if (html.includes("That's not the right answer")) {
    let hint = "";
    if (html.includes("too high")) {
      hint = " (too high)";
    } else if (html.includes("too low")) {
      hint = " (too low)";
    }
    partResult.attempts.push(answer);
    await saveResults(results);
    send({
      type: "submit_response",
      part,
      success: false,
      message: `Wrong answer${hint}`,
    });
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
    send({
      type: "submit_response",
      part,
      success: false,
      message: `Rate limited. Wait ${waitTime}`,
    });
  } else if (html.includes("Did you already complete it")) {
    if (partResult.result === null) {
      partResult.result = answer;
      partResult.time = roundedTime;
      await saveResults(results);
    }
    send({
      type: "submit_response",
      part,
      success: true,
      message: "Already completed",
    });
  } else {
    send({
      type: "submit_response",
      part,
      success: false,
      message: "Unknown response from server",
    });
  }
}

// Listen for submit commands on stdin
async function listenForCommands(solutionResults: SolutionResult[]) {
  const reader = Bun.stdin.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message: ToSubprocessMessage = JSON.parse(line);
        if (message.type === "submit" && message.part) {
          const result = solutionResults.find((r) => r.part === message.part);
          if (result) {
            await submitAnswer(result.part, result.answer, result.timeMs);
          }
        } else if (message.type === "shutdown") {
          process.exit(0);
        }
      } catch {
        // Ignore invalid JSON
      }
    }
  }
}

// Main execution
const solutionResults: SolutionResult[] = [];
const results = await loadResults();

try {
  const module = await import(`../${dayFilePath}?t=${Date.now()}`);
  const run: Run = module.run;

  for (const partName of ["part1", "part2"] as const) {
    const part = run[partName];
    const partNum = partName === "part1" ? 1 : 2;
    output(`--- Part ${partNum} ---`);

    // Run tests
    if (part.tests.length > 0) {
      for (let i = 0; i < part.tests.length; i++) {
        const test = part.tests[i]!;
        const result = part.solution(test.input);
        const passed = result === test.expected;
        if (passed) {
          output(`  \u2713 Test ${i + 1}: Passed`);
        } else {
          output(`  \u2717 Test ${i + 1}: Failed`);
          output(`    Expected: ${test.expected}`);
          output(`    Got:      ${result}`);
        }
      }
    } else {
      output("  No tests defined");
    }

    // Run solution on puzzle input
    if (!run.onlyTests) {
      const start = performance.now();
      const result = part.solution(puzzleInput);
      const timeMs = performance.now() - start;
      const partResult = getPartResult(results, dayIndex, partNum as 1 | 2);
      let statusMark = "  ";
      if (partResult.result !== null) {
        statusMark = String(result) === partResult.result ? "\u2713 " : "\u2717 ";
      }
      output(`  ${statusMark}Result: ${result} (${timeMs.toFixed(2)}ms)`);

      if (result !== undefined && result !== null) {
        const solutionResult: SolutionResult = {
          part: partNum as 1 | 2,
          answer: String(result),
          timeMs,
        };
        solutionResults.push(solutionResult);
        send({
          type: "result",
          part: partNum as 1 | 2,
          answer: String(result),
          timeMs,
        });
      }
    }
    output("");
  }

  // Signal ready with available parts
  const availableParts = solutionResults.map((r) => r.part);
  send({ type: "ready", parts: availableParts });

  // Listen for submit commands
  listenForCommands(solutionResults);
} catch (error) {
  send({
    type: "error",
    message: `Error running solutions: ${error instanceof Error ? error.message : String(error)}`,
  });
}
