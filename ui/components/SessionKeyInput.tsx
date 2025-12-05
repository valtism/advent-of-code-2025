import { TextAttributes } from "@opentui/core";
import { useState } from "react";
import { colors } from "../colors";

interface SessionKeyInputProps {
  onSubmit: (key: string) => void;
}

export function SessionKeyInput({ onSubmit }: SessionKeyInputProps) {
  const [value, setValue] = useState("");

  return (
    <box flexDirection="column" padding={1}>
      <text fg={colors.yellow}>AOC Session Key Required</text>
      <text />
      <text>
        To download puzzle inputs, you need your Advent of Code{" "}
        <span attributes={TextAttributes.UNDERLINE}>session cookie</span>.
      </text>
      <text />
      <text fg={colors.green}>How to get your session key:</text>
      <text>1. Go to https://adventofcode.com and log in</text>
      <text>2. Open your browser's Developer Tools (F12)</text>
      <text>3. Go to Application - Cookies - https://adventofcode.com</text>
      <text>4. Find the cookie named 'session' and copy its value</text>
      <text />
      <box>
        <text fg={colors.green}>Paste your session key: </text>
        <textarea
          placeholder="Type here..."
          focused
          onKeyDown={({}) => {
            
          }}
          backgroundColor="#1a1a1a"
          focusedBackgroundColor="#2d2d2d"
        />

        {/*<input
          focused
          placeholder=""
          value={value}
          onInput={setValue}
          onSubmit={handleSubmit}
          width={60}
          backgroundColor="#1a1a1a"
          focusedBackgroundColor="#2d2d2d"
        />*/}
      </box>
    </box>
  );
}
