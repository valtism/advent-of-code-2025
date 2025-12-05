import { TextAttributes, type TabSelectOption } from "@opentui/core";
import type { Subprocess } from "bun";
import { watch, type FSWatcher } from "fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { colors } from "../colors";
import type {
  Results,
  SolutionResult,
  SubprocessMessage,
  ToSubprocessMessage,
} from "../types";

interface SolutionRunnerProps {
  year: number;
  day: number;
  sessionKey: string;
  puzzleInput: string;
  results: Results;
  onResultsUpdate: (results: Results) => void;
}

export function SolutionRunner({
  year,
  day,
  sessionKey,
  puzzleInput,
  results,
  onResultsUpdate,
}: SolutionRunnerProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [solutionResults, setSolutionResults] = useState<SolutionResult[]>([]);
  const [isReady, setIsReady] = useState(false);

  const subprocessRef = useRef<Subprocess | null>(null);
  const watcherRef = useRef<FSWatcher | null>(null);

  const dayStr = day.toString().padStart(2, "0");
  const dayFilePath = `src/day${dayStr}.ts`;

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
        },
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
    [dayFilePath, day, sessionKey, onResultsUpdate],
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

  // Initial run and file watching
  useEffect(() => {
    spawnSubprocess(puzzleInput);

    // Watch for file changes
    const watcher = watch(dayFilePath, async () => {
      await spawnSubprocess(puzzleInput);
    });
    watcherRef.current = watcher;

    // Cleanup
    return () => {
      if (subprocessRef.current) {
        subprocessRef.current.kill();
      }
      if (watcherRef.current) {
        watcherRef.current.close();
      }
    };
  }, [dayFilePath, puzzleInput, spawnSubprocess]);

  const dayResult = results.days[day - 1];
  const submitOptions: TabSelectOption[] = solutionResults.map((r) => {
    const partResult = r.part === 1 ? dayResult?.part1 : dayResult?.part2;
    const isSolved = partResult?.result !== null && partResult?.result !== undefined;
    const checkMark = isSolved ? "\u2713 " : "";
    return {
      name: `${checkMark}Part ${r.part}`,
      description: `${r.answer} (${r.timeMs.toFixed(2)}ms)`,
      value: r.part,
    };
  });

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
            onSelect={(_index, option) => {
              if (option?.value) {
                submitAnswer(option.value as 1 | 2);
              }
            }}
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
  return colors.gray;
}
