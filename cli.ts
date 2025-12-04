import chalk from "chalk";

export async function selectFromList<T>(
  title: string,
  items: T[],
  defaultIndex: number,
  renderItem: (item: T, selected: boolean) => string,
): Promise<T> {
  let selectedIndex = defaultIndex;

  process.stdout.write("\x1b[?25l"); // Hide cursor

  const renderMenu = () => {
    process.stdout.write(`\x1b[${items.length + 2}A\x1b[J`);
    console.log(chalk.cyan.bold(`\n${title}\n`));
    for (let i = 0; i < items.length; i++) {
      console.log(renderItem(items[i]!, i === selectedIndex));
    }
  };

  // Initial render
  console.log(chalk.cyan.bold(`\n${title}\n`));
  for (let i = 0; i < items.length; i++) {
    console.log(renderItem(items[i]!, i === selectedIndex));
  }

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners("data");
      process.stdout.write("\x1b[?25h"); // Show cursor
    };

    const onKeypress = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x1b[A" || key === "k") {
        selectedIndex = Math.max(0, selectedIndex - 1);
        renderMenu();
      } else if (key === "\x1b[B" || key === "j") {
        selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
        renderMenu();
      } else if (key === "\r" || key === "\n") {
        cleanup();
        console.log();
        resolve(items[selectedIndex]!);
      } else if (key === "\x03") {
        cleanup();
        process.exit(0);
      }
    };

    process.stdin.on("data", onKeypress);
  });
}
