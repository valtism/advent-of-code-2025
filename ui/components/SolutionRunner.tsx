import type { Subprocess } from "bun";
import { type TabSelectOption, TextAttributes } from "@opentui/core";
import { watch, type FSWatcher } from "fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { colors } from "../colors";
import type {
  Results,
  SubprocessMessage,
  SolutionResult,
  ToSubprocessMessage,
} from "../types";

interface SolutionRunnerProps {
  year: number;
  day: number;
  sessionKey: string;
  results: Results;
  onResultsUpdate: (results: Results) => void;
}

export function SolutionRunner({
  year,
  day,
  sessionKey,
  results,
  onResultsUpdate,
}: SolutionRunnerProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [solutionResults, setSolutionResults] = useState<SolutionResult[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [setupStatus, setSetupStatus] = useState<string>("");

  const subprocessRef = useRef<Subprocess | null>(null);
  const watcherRef = useRef<FSWatcher | null>(null);

  const dayStr = day.toString().padStart(2, "0");
  const dayFilePath = `src/day${dayStr}.ts`;
  const inputFilePath = `src/day${dayStr}-input.txt`;

  // Download input and create solution file if needed
  const setup = useCallback(async () => {
    const inputFile = Bun.file(inputFilePath);
    if (!(await inputFile.exists())) {
      setSetupStatus(`Downloading input...`);
      const response = await fetch(
        `https://adventofcode.com/${year}/day/${day}/input`,
        { headers: { Cookie: `session=${sessionKey}` } }
      );

      if (!response.ok) {
        setOutput([`Failed to fetch input: ${response.status}`]);
        return null;
      }

      await Bun.write(inputFile, await response.text());
      setSetupStatus(`Downloaded ${inputFilePath}`);
    }

    const dayFile = Bun.file(dayFilePath);
    if (!(await dayFile.exists())) {
      const template = await Bun.file("template.ts").text();
      await Bun.write(dayFile, template);
      setSetupStatus(`Created ${dayFilePath} from template`);
    }

    return inputFile.text();
  }, [year, day, sessionKey, dayFilePath, inputFilePath]);

  // Spawn the subprocess
  const spawnSubprocess = useCallback(
    async (puzzleInput: string) => {
      // Kill existing subprocess
      if (subprocessRef.current) {
        subprocessRef.current.kill();
        subprocessRef.current = null;
      }

      setOutput([]);
      setSolutionResults([]);
      setIsReady(false);

      const proc = Bun.spawn(
        [
          "bun",
          "run",
          "subprocess/solution-subprocess.ts",
          dayFilePath,
          puzzleInput,
          String(day),
          sessionKey,
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
          stdin: "pipe",
        }
      );

      subprocessRef.current = proc;

      // Read stdout for JSON messages
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const readOutput = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const message: SubprocessMessage = JSON.parse(line);

              if (message.type === "output") {
                setOutput((prev) => [...prev, message.text]);
              } else if (message.type === "result") {
                setSolutionResults((prev) => [
                  ...prev,
                  {
                    part: message.part,
                    answer: message.answer,
                    timeMs: message.timeMs,
                  },
                ]);
              } else if (message.type === "ready") {
                setIsReady(true);
              } else if (message.type === "submit_response") {
                const statusIcon = message.success ? "\u2713" : "\u2717";
                setOutput((prev) => [
                  ...prev,
                  `${statusIcon} Part ${message.part}: ${message.message}`,
                ]);
                // Reload results if successful
                if (message.success) {
                  const updatedResults = await Bun.file("results.json").json();
                  onResultsUpdate(updatedResults);
                }
              } else if (message.type === "error") {
                setOutput((prev) => [...prev, `Error: ${message.message}`]);
              }
            } catch {
              // Not JSON, just output as text
              setOutput((prev) => [...prev, line]);
            }
          }
        }
      };

      readOutput();
    },
    [dayFilePath, day, sessionKey, onResultsUpdate]
  );

  // Send submit command to subprocess
  const submitAnswer = useCallback((part: 1 | 2) => {
    const stdin = subprocessRef.current?.stdin;
    if (stdin && typeof stdin !== "number") {
      const message: ToSubprocessMessage = { type: "submit", part };
      stdin.write(JSON.stringify(message) + "\n");
      stdin.flush();
    }
  }, []);

  // Initial setup and run
  useEffect(() => {
    const init = async () => {
      const puzzleInput = await setup();
      if (puzzleInput) {
        setSetupStatus("");
        await spawnSubprocess(puzzleInput);

        // Watch for file changes - only after setup has created the file
        const watcher = watch(dayFilePath, async () => {
          await spawnSubprocess(puzzleInput);
        });
        watcherRef.current = watcher;
      }
    };

    init();

    // Cleanup
    return () => {
      if (subprocessRef.current) {
        subprocessRef.current.kill();
      }
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [dayFilePath, setup, spawnSubprocess]);

  const handleSubmitSelect = (
    _index: number,
    option: TabSelectOption | null
  ) => {
    if (option?.value) {
      submitAnswer(option.value as 1 | 2);
    }
  };

  const submitOptions: TabSelectOption[] = solutionResults.map((r) => ({
    name: `Part ${r.part}`,
    description: `${r.answer} (${r.timeMs.toFixed(2)}ms)`,
    value: r.part,
  }));

  return (
    <box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <box
        paddingLeft={1}
        paddingRight={1}
        borderStyle="single"
        borderColor={colors.cyan}
      >
        <text fg={colors.cyan} attributes={TextAttributes.BOLD}>
          Advent of Code {year} - Day {day}
        </text>
      </box>

      {/* Setup status */}
      {setupStatus && (
        <box paddingLeft={1}>
          <text fg={colors.blue}>{setupStatus}</text>
        </box>
      )}

      {/* Output area */}
      <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1}>
        {output.map((line, i) => (
          <text key={i} fg={getLineColor(line)}>
            {line}
          </text>
        ))}
      </scrollbox>

      {/* Submit prompt */}
      {isReady && solutionResults.length > 0 && (
        <box paddingLeft={1} paddingRight={1} height={3}>
          <text fg={colors.cyan}>Submit answer: </text>
          <tab-select
            focused
            options={submitOptions}
            onSelect={handleSubmitSelect}
            showDescription
            tabWidth={25}
          />
        </box>
      )}
    </box>
  );
}

function getLineColor(line: string): string {
  if (line.startsWith("---")) return colors.yellow;
  if (line.includes("\u2713")) return colors.green;
  if (line.includes("\u2717")) return colors.orange;
  if (line.includes("Result:")) return colors.pink;
  if (line.includes("Error:")) return colors.orange;
  return colors.purple;
}
