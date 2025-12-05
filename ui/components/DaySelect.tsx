import { type SelectOption } from "@opentui/core";
import { colors } from "../colors";
import type { Results } from "../types";

interface DaySelectProps {
  year: number;
  results: Results;
  onSelect: (day: number) => void;
}

function getMaxDays(year: number): number {
  // 2025 onwards is still in progress
  return year >= 2025 ? 12 : 25;
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

export function DaySelect({ year, results, onSelect }: DaySelectProps) {
  const maxDays = getMaxDays(year);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);
  const defaultIndex = getDefaultDayIndex(results);

  const options: SelectOption[] = days.map((day) => {
    const dayResult = results.days[day - 1];
    const part1Done = !!dayResult?.part1.result;
    const part2Done = !!dayResult?.part2.result;

    let status: string;
    if (part1Done && part2Done) {
      status = "\u2605\u2605"; // ★★
    } else if (part1Done) {
      status = "\u2605\u2606"; // ★☆
    } else {
      status = "\u2606\u2606"; // ☆☆
    }

    const dayStr = day.toString().padStart(2, " ");
    return {
      name: `Day ${dayStr}  ${status}`,
      value: day,
      description: "",
    };
  });

  return (
    <box flexDirection="column">
      <box padding={1}>
        <text fg={colors.cyan}>Select day ({year}):</text>
      </box>
      <select
        focused
        options={options}
        selectedIndex={defaultIndex}
        onSelect={(_index, option) => {
          if (option?.value) {
            onSelect(option.value as number);
          }
        }}
        height={Math.min(maxDays + 2, 20)}
        showDescription={false}
        focusedBackgroundColor="transparent"
        selectedBackgroundColor="transparent"
        selectedTextColor={colors.yellow}
      />
    </box>
  );
}
