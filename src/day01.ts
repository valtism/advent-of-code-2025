export const run = {
  part1: {
    tests: [
      {
        input: `L68
        L30
        R48
        L5
        R60
        L55
        L1
        L99
        R14
        L82`,
        expected: 3,
      },
    ],
    solution: part1,
  },
  part2: {
    tests: [
      {
        input: `L68
        L30
        R48
        L5
        R60
        L55
        L1
        L99
        R14
        L82`,
        expected: 6,
      },
    ],
    solution: part2,
  },
  onlyTests: false,
};

const parseInput = (rawInput: string) => rawInput;

function part1(rawInput: string) {
  const input = parseInput(rawInput)
    .split("\n")
    .map((line) => line.trim());

  const directions = input.map((line) => {
    const direction = line[0];
    let amount = Number(line.slice(1));
    if (direction === "L") {
      amount = amount * -1;
    }
    return amount;
  });

  let dial = 50;
  let password = 0;
  directions.forEach((direction) => {
    dial = (dial + direction + 10000) % 100;
    if (dial === 0) {
      password++;
    }
  });

  return password;
}

function part2(rawInput: string) {
  const input = parseInput(rawInput)
    .split("\n")
    .map((line) => line.trim());

  let dial = 50;
  let password = 0;

  input.forEach((line) => {
    const direction = line[0];
    let amount = Number(line.slice(1));
    for (let i = 0; i < amount; i++) {
      const inc = direction === "R" ? 1 : -1;
      dial = dial + inc;
      if (dial > 99) {
        dial = 0;
      }
      if (dial < 0) {
        dial = 99;
      }
      if (dial === 0) password++;
    }
  });

  return password;
}
