import * as cp from "node:child_process";
import { exec, spawn, execFile, execSync, spawnSync, execFileSync } from "child_process";
import myChildProcess from "node:child_process";
declare const require: (mod: string) => any;
const reqCp = require("child_process");

// ruleid: pi-mcp.no-shell
cp.exec("ls");

// ruleid: pi-mcp.no-shell
exec("ls");

// ruleid: pi-mcp.no-shell
execSync("whoami");

// ruleid: pi-mcp.no-shell
myChildProcess.execSync("whoami");

// ruleid: pi-mcp.no-shell
reqCp.execSync("whoami");

// ruleid: pi-mcp.no-shell
spawn("sh", ["-c", "ls"], { shell: true });

// ruleid: pi-mcp.no-shell
cp.spawn("sh", { shell: true });

// ruleid: pi-mcp.no-shell
reqCp.spawn("sh", { shell: true });

// ruleid: pi-mcp.no-shell
execFile("node", ["-v"], { shell: true });

// ruleid: pi-mcp.no-shell
spawnSync("sh", ["-c", "ls"], { shell: true });

// ruleid: pi-mcp.no-shell
execFileSync("sh", ["-c", "ls"], { shell: true });

// ruleid: pi-mcp.no-shell
require("child_process").exec("ls");

// ruleid: pi-mcp.no-shell
require("node:child_process").execSync("whoami");

// ruleid: pi-mcp.no-shell
require("child_process").spawn("sh", ["-c", "ls"], { shell: true });

// ruleid: pi-mcp.no-shell
require("node:child_process").execFile("node", ["-v"], { shell: true });

// ok: pi-mcp.no-shell
spawn("node", ["-v"]);

// ok: pi-mcp.no-shell
cp.spawn("node", ["-v"], { stdio: "inherit" });

// ok: pi-mcp.no-shell
spawn("node", ["-v"], { shell: false });

// ok: pi-mcp.no-shell
execFile("node", ["-v"]);

// ok: pi-mcp.no-shell
require("child_process").spawn("node", ["-v"]);

// ok: pi-mcp.no-shell
require("node:child_process").spawn("node", ["-v"], { shell: false });
