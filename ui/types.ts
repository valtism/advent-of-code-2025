export type PartResult = {
  result: string | null;
  attempts: string[];
  time: number | null;
};

export type DayResult = {
  part1: PartResult;
  part2: PartResult;
};

export type Results = {
  year: number;
  days: DayResult[];
};

export type SolutionResult = {
  part: 1 | 2;
  answer: string;
  timeMs: number;
};

// Subprocess IPC message types
export type SubprocessMessage =
  | { type: "output"; text: string }
  | { type: "result"; part: 1 | 2; answer: string; timeMs: number }
  | { type: "ready"; parts: (1 | 2)[] }
  | { type: "submit_response"; part: 1 | 2; success: boolean; message: string }
  | { type: "error"; message: string };

export type ToSubprocessMessage =
  | { type: "submit"; part: 1 | 2 }
  | { type: "shutdown" };

// App state phases
export type AppPhase =
  | { type: "loading" }
  | { type: "session_key_required" }
  | { type: "year_selection" }
  | { type: "day_selection"; year: number; results: Results }
  | {
      type: "running";
      year: number;
      day: number;
      sessionKey: string;
      results: Results;
    };
