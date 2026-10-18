declare const ctx: { ui: { notify(msg: unknown, level?: string): void } };

// ruleid: pi-mcp.no-stdout
console.log("[pi-mcp] connected");

// ruleid: pi-mcp.no-stdout
console.info("[pi-mcp] info");

// ruleid: pi-mcp.no-stdout
console.debug("[pi-mcp] debug");

// ruleid: pi-mcp.no-stdout
console.warn("[pi-mcp] warn");

// ruleid: pi-mcp.no-stdout
console.table(["a", "b"]);

// ruleid: pi-mcp.no-stdout
console.dir({ a: 1 });

// ruleid: pi-mcp.no-stdout
process.stdout.write("raw stdout\n");

// ok: pi-mcp.no-stdout
console.error("[pi-mcp] error");

// ok: pi-mcp.no-stdout
process.stderr.write("raw stderr\n");

// ok: pi-mcp.no-stdout
ctx.ui.notify("connected", "info");
