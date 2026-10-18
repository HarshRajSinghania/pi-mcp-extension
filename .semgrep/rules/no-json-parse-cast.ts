declare const raw: string;
interface User {
  id: string;
}

// ruleid: pi-mcp.no-json-parse-cast
const a = JSON.parse(raw) as User;

// ruleid: pi-mcp.no-json-parse-cast
const b = JSON.parse(raw) as any;

// ruleid: pi-mcp.no-json-parse-cast
const c = JSON.parse(raw) as unknown as User;

// ruleid: pi-mcp.no-json-parse-cast
const d = (JSON.parse(raw) as any) as unknown;

// ok: pi-mcp.no-json-parse-cast
const e = JSON.parse(raw) as unknown;

// ok: pi-mcp.no-json-parse-cast
const f = JSON.parse(raw);

// ok: pi-mcp.no-json-parse-cast
const g: unknown = JSON.parse(raw);

export { a, b, c, d, e, f, g };
