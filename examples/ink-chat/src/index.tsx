#!/usr/bin/env node
import { render } from "ink";
import { App } from "./app.js";

// Clear terminal and move cursor to top-left
process.stdout.write("\x1B[2J\x1B[3J\x1B[H");

render(<App />, { exitOnCtrlC: false });
