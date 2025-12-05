import { useKeyboard } from "@opentui/react";
import { useEffect, useState } from "react";
import { colors } from "./colors";
import { DaySelect } from "./components/DaySelect";
import { SessionKeyInput } from "./components/SessionKeyInput";
import { SolutionRunner } from "./components/SolutionRunner";
import { YearSelect } from "./components/YearSelect";
import type { AppPhase, Results } from "./types";

const envPath = ".env";
const resultsPath = "results.json";

async function loadSessionKey(): Promise<string | null> {
  const envFile = Bun.file(envPath);
  if (await envFile.exists()) {
    const content = await envFile.text();
    const match = content.match(/^AOC_SESSION_KEY=(.+)$/m);
    return match?.[1] ?? null;
  }
  return null;
}

async function saveSessionKey(key: string): Promise<void> {
  await Bun.write(envPath, `AOC_SESSION_KEY=${key}\n`);
}

async function loadResults(): Promise<Results | null> {
  const resultsFile = Bun.file(resultsPath);
  if (await resultsFile.exists()) {
    return resultsFile.json();
  }
  return null;
}

async function saveResults(results: Results): Promise<void> {
  await Bun.write(resultsPath, JSON.stringify(results, null, 2) + "\n");
}

export function App() {
  const [phase, setPhase] = useState<AppPhase>({ type: "loading" });
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  // Handle Ctrl+C to exit
  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      process.exit(0);
    }
  });

  // Initial loading
  useEffect(() => {
    async function init() {
      const [key, results] = await Promise.all([
        loadSessionKey(),
        loadResults(),
      ]);

      if (!key) {
        setPhase({ type: "session_key_required" });
        return;
      }

      setSessionKey(key);

      if (!results) {
        setPhase({ type: "year_selection" });
        return;
      }

      setPhase({ type: "day_selection", year: results.year, results });
    }

    init();
  }, []);

  const handleSessionKeySubmit = async (key: string) => {
    await saveSessionKey(key);
    setSessionKey(key);

    const results = await loadResults();
    if (!results) {
      setPhase({ type: "year_selection" });
    } else {
      setPhase({ type: "day_selection", year: results.year, results });
    }
  };

  const handleYearSelect = async (year: number) => {
    const results: Results = { year, days: [] };
    await saveResults(results);
    setPhase({ type: "day_selection", year, results });
  };

  const handleDaySelect = (day: number) => {
    if (phase.type !== "day_selection" || !sessionKey) return;

    setPhase({
      type: "running",
      year: phase.year,
      day,
      sessionKey,
      results: phase.results,
    });
  };

  const handleResultsUpdate = (results: Results) => {
    if (phase.type === "running") {
      setPhase({ ...phase, results });
    }
  };

  return (
    <box>
      <text>Advent of Code 🎄</text>

      {phase.type === "loading" && (
        <box flexDirection="column" padding={1}>
          <text fg={colors.cyan}>Loading...</text>
        </box>
      )}
      {phase.type === "session_key_required" && (
        <SessionKeyInput onSubmit={handleSessionKeySubmit} />
      )}

      {phase.type === "year_selection" && (
        <YearSelect onSelect={handleYearSelect} />
      )}

      {phase.type === "day_selection" && (
        <DaySelect
          year={phase.year}
          results={phase.results}
          onSelect={handleDaySelect}
        />
      )}

      {phase.type === "running" && (
        <SolutionRunner
          year={phase.year}
          day={phase.day}
          sessionKey={phase.sessionKey}
          results={phase.results}
          onResultsUpdate={handleResultsUpdate}
        />
      )}
    </box>
  );
}
