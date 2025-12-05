import dedent from "dedent";

export const run = {
  part1: {
    tests: [
      {
        input: dedent`3-5
        10-14
        16-20
        12-18

        1
        5
        8
        11
        17
        32`,
        expected: 3,
      },
    ],
    solution: part1,
  },
  part2: {
    tests: [
      {
        input: dedent`3-5
        10-14
        16-20
        12-18

        1
        5
        8
        11
        17
        32`,
        expected: 14,
      },
    ],
    solution: part2,
  },
  onlyTests: false,
};

const parseInput = (rawInput: string) =>
  rawInput.split("\n\n").map((group) => group.split("\n"));

function part1(rawInput: string) {
  const input = parseInput(rawInput);
  const ranges = input[0]!.map((line) => {
    const range = line.split("-");
    const min = Number(range[0]!);
    const max = Number(range[1]!);
    return { min, max };
  });

  const ids = input[1]!.map(Number);

  const fresh = ids.filter((id) => {
    const res = ranges.some(({ min, max }) => {
      return id >= min && id <= max;
    });
    return res;
  });

  return fresh.length;
}

type Range = {
  min: number;
  max: number;
};

function part2(rawInput: string) {
  const input = parseInput(rawInput);
  const ranges = input[0]!.map((line) => {
    const range = line.split("-");
    const min = Number(range[0]!);
    const max = Number(range[1]!);
    return { min, max };
  });

  const mins = ranges.map((range) => range.min);
  const maxes = ranges.map((range) => range.max);

  // we have duplicate mins and maxes, so we have to work with indicies maybe

  // smallest min (start point)

  const expandedRanges: Range[] = [];
  const endMax = ranges.reduce(
    (highest, range) => (range.max > highest ? range.max : highest),
    0,
  );

  while (!expandedRanges.some((range) => range.max === endMax)) {
    const highestMaxInExpandedRanges = expandedRanges.reduce(
      (highest, range) => (range.max > highest ? range.max : highest),
      0,
    );
    const rangeToExpand = ranges
      .filter((range) => range.min > highestMaxInExpandedRanges)
      .reduce((lowest, range) => (range.min < lowest.min ? range : lowest));
    const expandedRange = expandRange(rangeToExpand);
    expandedRanges.push(expandedRange);
  }

  function expandRange(range: Range) {
    const expandedRange = { ...range };
    let hasUpdatedMax = true;
    while (hasUpdatedMax) {
      hasUpdatedMax = false;

      ranges.forEach((range) => {
        if (
          range.min >= expandedRange.min &&
          range.min <= expandedRange.max &&
          range.max > expandedRange.max
        ) {
          expandedRange.max = range.max;
          hasUpdatedMax = true;
        }
      }, 0);
    }
    return expandedRange;
  }

  const idCount = expandedRanges.reduce(
    (count, range) => count + range.max - range.min + 1,
    0,
  );

  return idCount
}
