export const run = {
  part1: {
    tests: [
      {
        input: `123 328  51 64 
 45 64  387 23 
  6 98  215 314
*   +   *   +  `,
        expected: 4277556,
      },
    ],
    solution: part1,
  },
  part2: {
    tests: [
      {
        input: `123 328  51 64 
 45 64  387 23 
  6 98  215 314
*   +   *   +  `,
        expected: 3263827,
      },
    ],
    solution: part2,
  },
  onlyTests: false,
};

const parseInput = (rawInput: string) => rawInput.split("\n");

function part1(rawInput: string) {
  const input = parseInput(rawInput)
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/));
  const nums = input.slice(0, -1).map((row) => row.map(Number));
  const operands = input.slice(-1)[0];
  if (!operands) throw new Error();

  const results: number[] = [];
  for (let i = 0; i < operands.length; i++) {
    const operator = operands[i]!;
    const problemNums = nums.reduce<number[]>((list, row) => {
      list.push(row[i]!);
      return list;
    }, []);
    const problemResult = problemNums.reduce((res, num) => {
      if (operator === "+") {
        return res + num;
      } else {
        return res * num;
      }
    });
    results.push(problemResult);
  }

  return results.reduce((acc, curr) => acc + curr);
}

function part2(rawInput: string) {
  const input = parseInput(rawInput);

  const numbers = input.slice(0, -1);
  const operands = input.at(-1)!;
  const operandIndices = operands
    .split("")
    .reduce<
      { startIndex: number; operator: string }[]
    >((indices, char, index) => {
      if (char !== " ") {
        indices.push({ startIndex: index, operator: char });
      }
      return indices;
    }, []);

  // console.log({ operandIndices });

  const results: number[] = [];
  operandIndices.forEach(({ startIndex, operator }, i) => {
    const nextIndex = operandIndices[i + 1];
    const endIndex = nextIndex ? nextIndex.startIndex - 1 : operands.length;

    const vertNums: number[] = [];
    for (let index = startIndex; index < endIndex; index++) {
      const vertNum = Number(
        numbers.reduce(
          (verticalNumber, numberLine) => (verticalNumber += numberLine[index]),
          "",
        ),
      );
      vertNums.push(vertNum);
    }
    const result = vertNums.reduce((acc, curr) => {
      if (operator === "+") {
        return acc + curr;
      } else {
        return acc * curr;
      }
    });
    results.push(result);
  });

  return results.reduce((acc, curr) => acc + curr);
}

function chunkString(string: string, size: number) {
  const chunks: string[] = [];
  for (let i = 0; i < string.length; i += size + 1) {
    chunks.push(string.slice(i, i + size));
  }
  return chunks;
}
