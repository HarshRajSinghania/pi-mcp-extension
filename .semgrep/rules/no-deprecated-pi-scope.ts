declare const require: (mod: string) => any;

// ruleid: pi-mcp.no-deprecated-pi-scope
import { something } from "@mariozechner/pi-ai";

// ruleid: pi-mcp.no-deprecated-pi-scope
import "@mariozechner/pi-coding-agent";

// ruleid: pi-mcp.no-deprecated-pi-scope
const pkg = require("@mariozechner/pi-ai");

// ruleid: pi-mcp.no-deprecated-pi-scope
const dyn = await import("@mariozechner/pi-coding-agent");

// ruleid: pi-mcp.no-deprecated-pi-scope
export { foo } from "@mariozechner/pi-ai";

// ok: pi-mcp.no-deprecated-pi-scope
import { somethingElse } from "@earendil-works/pi-ai";

// ok: pi-mcp.no-deprecated-pi-scope
import "@earendil-works/pi-coding-agent";

// ok: pi-mcp.no-deprecated-pi-scope
const okPkg = require("@earendil-works/pi-ai");

// ok: pi-mcp.no-deprecated-pi-scope
const okDyn = await import("@earendil-works/pi-coding-agent");

// ok: pi-mcp.no-deprecated-pi-scope
export { okFoo } from "@earendil-works/pi-ai";
