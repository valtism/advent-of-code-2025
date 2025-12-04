export const run = {
  part1: {
    tests: [
      {
        input: `11-22,95-115,998-1012,1188511880-1188511890,222220-222224,1698522-1698528,446443-446449,38593856-38593862,565653-565659,824824821-824824827,2121212118-2121212124`,
        expected: 1227775554,
      },
    ],
    solution: part1,
  },
  part2: {
    tests: [
      {
        input: `11-22,95-115,998-1012,1188511880-1188511890,222220-222224,1698522-1698528,446443-446449,38593856-38593862,565653-565659,824824821-824824827,2121212118-2121212124`,
        expected: 4174379265,
      },
    ],
    solution: part2,
  },
  onlyTests: false,
};

const parseInput = (rawInput: string) =>
  rawInput.split(",").map((range) => {
    let [start, end] = range.split("-");

    return { start: Number(start), end: Number(end) };
  });

function part1(rawInput: string) {
  const input = parseInput(rawInput);
  let result = 0;
  input.forEach(({ start, end }) => {
    for (let i = start; i <= end; i++) {
      const digits = numDigits(i);
      const base = 10 ** (digits / 2);
      const left = Math.floor(i / base);
      const right = i % base;
      if (left === right) {
        result += i;
      }
    }
  });

  return result;
}

function numDigits(n: number) {
  return Math.floor(Math.log10(n)) + 1;
}

function part2(rawInput: string) {
  const input = parseInput(rawInput);

  let result = 0;

  input.forEach(({ start, end }) => {
    for (let num = start; num <= end; num++) {
      const numString = String(num);
      for (let size = 1; size <= numString.length / 2; size++) {
        if (numString.length % size !== 0) continue;
        const chunks = chunk(numString, size);
        const allSame = chunks.every((chunk) => chunk === chunks[0]);
        if (allSame) {
          result += num;
          break;
        }
      }
    }
  });

  return result;
}

function chunk(string: string, size: number) {
  const res: string[] = [];
  let index = size;
  while (index - size < string.length) {
    res.push(string.slice(index - size, index));
    index += size;
  }
  return res;
}
