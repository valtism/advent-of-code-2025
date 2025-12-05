import { type SelectOption } from "@opentui/core";
import { colors } from "../colors";

interface YearSelectProps {
  onSelect: (year: number) => void;
}

const aocStartYear = 2015;

export function YearSelect({ onSelect }: YearSelectProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - aocStartYear + 1 },
    (_, i) => aocStartYear + i,
  );

  const options: SelectOption[] = years.map((year) => ({
    name: String(year),
    description: "",
    value: year,
  }));

  const handleSelect = (_index: number, option: SelectOption | null) => {
    if (option?.value) {
      onSelect(option.value as number);
    }
  };

  return (
    <box flexDirection="column" padding={1} gap={1}>
      <text fg={colors.pink}>Select Advent of Code year:</text>
      <select
        focused
        options={options}
        selectedIndex={years.length - 1}
        onSelect={handleSelect}
        height={options.length}
        showDescription={false}
        width={10}
        focusedBackgroundColor="transparent"
        // backgroundColor="#3b82f6"
        // selectedBackgroundColor="#3b82f6"
        // selectedTextColor="#ffffff"
      />
    </box>
  );
}
