export const run = {
  part1: {
    tests: [
      {
        input: `..@@.@@@@.
@@@.@.@.@@
@@@@@.@.@@
@.@@@@..@.
@@.@@@@.@@
.@@@@@@@.@
.@.@.@.@@@
@.@@@.@@@@
.@@@@@@@@.
@.@.@@@.@.`,
        expected: 13,
      },
    ],
    solution: part1,
  },
  part2: {
    tests: [
      {
        input: `..@@.@@@@.
@@@.@.@.@@
@@@@@.@.@@
@.@@@@..@.
@@.@@@@.@@
.@@@@@@@.@
.@.@.@.@@@
@.@@@.@@@@
.@@@@@@@@.
@.@.@@@.@.`,
        expected: 43,
      },
    ],
    solution: part2,
  },
  onlyTests: false,
};

const parseInput = (rawInput: string) =>
  rawInput.split("\n").map((line) => line.split(""));

function part1(rawInput: string) {
  const input = parseInput(rawInput);

  let accessibleRolls = 0;
  for (let x = 0; x < input[0]!.length; x++) {
    for (let y = 0; y < input.length; y++) {
      if (input[y]![x] !== "@") continue;

      const adjacentRollsCount = neighbours
        .map(({ dx, dy }) => input[y + dy]?.[x + dx])
        .filter((neighbour) => neighbour === "@").length;

      if (adjacentRollsCount < 4) {
        accessibleRolls++;
      }
    }
  }

  return accessibleRolls;
}

const neighbours = [
  { dx: -1, dy: -1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: -1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
];

function part2(rawInput: string) {
  const input = parseInput(rawInput);

  let removalCount = 0;
  let hasRemovedThisIteration = true;
  while (hasRemovedThisIteration) {
    hasRemovedThisIteration = false;

    for (let x = 0; x < input[0]!.length; x++) {
      for (let y = 0; y < input.length; y++) {
        if (input[y]![x] !== "@") continue;

        const adjacentRollsCount = neighbours
          .map(({ dx, dy }) => input[y + dy]?.[x + dx])
          .filter((neighbour) => neighbour === "@").length;

        if (adjacentRollsCount < 4) {
          input[y]![x]! = ".";
          removalCount++;
          hasRemovedThisIteration = true;
        }
      }
    }
  }

  return removalCount;
}
