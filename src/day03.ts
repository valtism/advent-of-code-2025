export const run = {
  part1: {
    tests: [
      {
        input: `987654321111111
811111111111119
234234234234278
818181911112111`,
        expected: 357,
      },
    ],
    solution: part1,
  },
  part2: {
    tests: [
      {
        input: `987654321111111
811111111111119
234234234234278
818181911112111`,
        expected: 3121910778619,
      },
    ],
    solution: part2,
  },
  onlyTests: false,
};

const parseInput = (rawInput: string) => rawInput.split("\n");

function part1(rawInput: string) {
  const input = parseInput(rawInput);
  const maxJolts = input.map((bank) => {
    let max = "0";
    for (let i = 0; i < bank.length - 1; i++) {
      for (let j = i + 1; j < bank.length; j++) {
        const jolts = `${bank[i]}${bank[j]}`;
        if (jolts > max) {
          max = jolts;
        }
      }
    }
    return max;
  });

  return maxJolts.map(Number).reduce((acc, curr) => acc + curr);
}

function part2(rawInput: string) {
  const input = parseInput(rawInput);

  const size = 12;

  const maxJolts = input.map((bank) => {
    // [0, 1, 2, ... 12]
    const jolts = bank.slice(0, 12).split("");

    // iterate from 13 to end of bank
    for (let i = size; i < bank.length; i++) {
      const digit = bank[i]!;
      // check if any jolt sequence goes up and remove left
      const toRemove = jolts.findIndex((jolt, i, arr) => {
        return arr[i + 1] && arr[i + 1]! > jolt;
      });
      if (toRemove !== -1) {
        jolts.splice(toRemove, 1);
        jolts.push(digit);
      } else if (digit > jolts.at(-1)!) {
        jolts.pop();
        jolts.push(digit);
      }
    }
    return jolts.join("");
  });

  return maxJolts.map(Number).reduce((acc, curr) => acc + curr);

  // const maxJolts = input.map((bank) => {
  //   const indexCombos = generateCombinations(12, bank.length - 1);
  //   let max = "0";
  //   for (const combo of indexCombos) {
  //     const jolts = combo.map((index) => bank[index]).join("");
  //     if (jolts > max) {
  //       max = jolts;
  //     }
  //   }
  //   return max;
  // });

  // return maxJolts.map(Number).reduce((acc, curr) => acc + curr);
}

function* generateCombinations(
  size: number,
  limit: number,
): Generator<number[]> {
  // Start with initial indices [0, 1, 2, ...] up to size
  const indices = Array.from({ length: size }, (_, i) => i);

  yield indices;

  while (true) {
    for (let pos = indices.length - 1; pos >= 0; pos--) {
      const index = indices[pos]!;
      const nextIndex = indices[pos + 1];
      const atLimit = index >= limit;
      const atNextIndex = !!nextIndex && nextIndex <= index + 1;
      if (!atLimit && !atNextIndex) {
        for (let i = 0; i + pos < indices.length; i++) {
          indices[pos + i] = index + i + 1;
        }
        yield indices;
        break;
      }
      if (pos === 0) {
        return;
      }
    }
  }
}
