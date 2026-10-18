declare const ctx: { ui: { notify(msg: unknown, level?: string): void; setStatus(name: string, status: unknown): void } };
declare const ui: { setStatus(name: string, status: unknown): void };
declare const tokens: {
  access_token: string;
  refresh_token: string;
  client_secret: string;
  code_verifier: string;
  codeVerifier: string;
  authorizationCode: string;
  authorization_code: string;
};
declare const req: { headers: { Authorization: string; authorization: string; get(h: string): string } };
declare const access_token: string;
declare const refresh_token: string;

// ruleid: pi-mcp.no-secret-logging
console.error("token:", tokens.access_token);

// ruleid: pi-mcp.no-secret-logging
console.error(`access token is ${tokens.access_token}`);

// ruleid: pi-mcp.no-secret-logging
ctx.ui.notify(tokens.refresh_token);

// ruleid: pi-mcp.no-secret-logging
ctx.ui.setStatus("pi-mcp", `connected with ${tokens.access_token}`);

// ruleid: pi-mcp.no-secret-logging
ui.setStatus("pi-mcp", tokens.client_secret);

// ruleid: pi-mcp.no-secret-logging
console.error("code verifier:", tokens.codeVerifier);

// ruleid: pi-mcp.no-secret-logging
console.error("code verifier snake:", tokens.code_verifier);

// ruleid: pi-mcp.no-secret-logging
console.error("auth code:", tokens.authorizationCode);

// ruleid: pi-mcp.no-secret-logging
console.error("header:", req.headers.Authorization);

// ruleid: pi-mcp.no-secret-logging
console.error("header bracket:", req.headers["Authorization"]);

// ruleid: pi-mcp.no-secret-logging
console.error("header get:", req.headers.get("Authorization"));

// ruleid: pi-mcp.no-secret-logging
console.error("bare secret:", access_token);

// ruleid: pi-mcp.no-secret-logging
console.error(`bare template: ${refresh_token}`);

// ok: pi-mcp.no-secret-logging
console.error("[pi-mcp] refreshed tokens for server");

// ok: pi-mcp.no-secret-logging
ctx.ui.notify("Connected to server", "info");

// ok: pi-mcp.no-secret-logging
ctx.ui.setStatus("pi-mcp", "ready");

declare const serverName: string;
// ok: pi-mcp.no-secret-logging
console.error(`server ${serverName} connected`);
