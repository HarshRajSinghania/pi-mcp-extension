# AGENTS.md — `pi-mcp-extension` Engineering Standards

This file is the authoritative engineering guide for AI coding agents (Pi, Claude Code, OpenCode, Antigravity, Cursor, Codex) and human contributors working on `pi-mcp-extension`.

`pi-mcp-extension` is a lightweight TypeScript CLI extension for the **Pi coding agent** that bridges MCP (Model Context Protocol) servers (`stdio`, `sse`, and `streamable-http`) into Pi tools and slash commands, including OAuth 2.1 + PKCE + Dynamic Client Registration (DCR) and project-level trust verification.

---

## 1. Repository Map & Verification Commands

### Source Layout (`src/`)
Keep `src/` flat and cohesive. Do **not** introduce multi-layer enterprise folder trees (`store_impl.ts`, `business.ts`, 7-file vertical slices). Extract a new file only when isolating a self-contained pure domain module or splitting an oversized file (>400 lines).

- [`src/index.ts`](src/index.ts) — Extension entrypoint (default export loaded by Pi), session lifecycle (`session_start`, `session_shutdown`), connection coordination (`connectRequested`, `authQueue`, startup prompts), interactive OAuth orchestration (`authorize`), `/mcp*` slash commands, and `mcp_status` / `mcp_connect` tools.
- [`src/server-manager.ts`](src/server-manager.ts) — MCP client lifecycle (`stopped | starting | ready | failed`), transport creation (`stdio`, `sse`, `streamable-http`), exponential backoff retries, health checks, `roots/list`, and child process cleanup.
- [`src/tool-bridge.ts`](src/tool-bridge.ts) — MCP `tools/list` discovery, JSON Schema $\rightarrow$ TypeBox conversion, tool name sanitization/hashing, collision handling, and Pi tool registration/execution.
- [`src/config.ts`](src/config.ts) — Zod configuration schemas, global (`~/.pi/agent/mcp.json`) + project (`.pi/mcp.json`) merging, `${ENV_VAR}` interpolation, and SHA-256 project trust verification (`trusted-projects.json`).
- [`src/oauth-provider.ts`](src/oauth-provider.ts) — `OAuthClientProvider` implementation for the MCP SDK (silent vs. interactive modes, token/DCR/discovery persistence, PKCE state, refresh token rotation).
- [`src/auth-lock.ts`](src/auth-lock.ts) — Cross-process file lock (`<hash>.json.lock`) with heartbeat `mtime` and atomic stale-lock reclamation.
- [`src/callback-server.ts`](src/callback-server.ts) & [`src/callback-url.ts`](src/callback-url.ts) — Loopback HTTP OAuth callback listener (`127.0.0.1`) and pure redirect/callback URL validation & parsing for local and headless/SSH paste-back flows.
- [`src/auth-challenge.ts`](src/auth-challenge.ts) — `WWW-Authenticate` (`RFC 9728` `resource_metadata` & `scope`) pre-flight discovery.
- [`src/errors.ts`](src/errors.ts) — `McpError` (`config | connection | auth | timeout | protocol`) and OAuth error subclasses (`AuthRequiredError`, `AuthLockError`, `AuthCancelledError`).

### Test Suite (`tests/`)
Tests use Node's built-in test runner (`node:test` + `node:assert/strict`) executed via `tsx`:
- Unit & pure-policy suites: [`tests/config.test.ts`](tests/config.test.ts), [`tests/tool-bridge.test.ts`](tests/tool-bridge.test.ts), [`tests/auth-lock.test.ts`](tests/auth-lock.test.ts), [`tests/auth-arguments.test.ts`](tests/auth-arguments.test.ts), [`tests/completions.test.ts`](tests/completions.test.ts).
- Lifecycle, coordination & end-to-end suites: [`tests/server-manager.test.ts`](tests/server-manager.test.ts), [`tests/connection-coordination.test.ts`](tests/connection-coordination.test.ts), [`tests/oauth-fixes.test.ts`](tests/oauth-fixes.test.ts), [`tests/auth-commands.test.ts`](tests/auth-commands.test.ts), [`tests/management-tools.test.ts`](tests/management-tools.test.ts), [`tests/pi-1x-compat.test.ts`](tests/pi-1x-compat.test.ts).
- Shared test fixtures: [`tests/mock-server.ts`](tests/mock-server.ts) and [`tests/helpers/`](tests/helpers/).

### Mandatory Verification Commands
Run all three gates before concluding any code change:
```bash
npm run typecheck      # tsc --noEmit
npm test               # node --import tsx/esm --test ./tests/*.test.ts
npm pack --dry-run     # Verify published tarball only ships src/, README.md, LICENSE
```

---

## 2. Architecture Rule: I/O Isolation, Pure Core & Testability

1. **Separate Pure Policy/Transform Logic from I/O**:
   - Keep state transitions, retry/timeout calculations, lock staleness policies, JSON Schema $\rightarrow$ TypeBox conversion, tool-name formatting & collision resolution, URL/argument parsing, and config merging as **pure, deterministic functions** with zero direct I/O.
   - Keep I/O adapters thin: MCP SDK transports, `node:fs`, `node:child_process`, ephemeral `node:http` servers, OS browser openers, and timers.
2. **Injectable Boundaries for Deterministic Testing**:
   - When a module touches external state (filesystem, wall clock, PID checks, network/transports, browser spawning), accept an optional dependency struct with production defaults (e.g., `{ fs, clock, pid, hostname, isPidAlive }` in [`src/auth-lock.ts`](src/auth-lock.ts)) so unit tests use deterministic fakes instead of real `setTimeout` sleeps, network sockets, or OS processes.
3. **Minimal Runtime Dependencies**:
   - Do **not** add heavyweight runtime packages (e.g., web logging frameworks like `pino`) to `dependencies` in [`package.json`](package.json). Every runtime dependency slows down Pi extension installation for all users.

---

## 3. Process, TUI, Subprocess & Security Rule (Rugged Constitution)

1. **TUI & `stdout` Sanctity**:
   - **Never write to `stdout`**. `stdout` belongs exclusively to Pi's TUI / RPC stream and stdio MCP framing.
   - Surface user-facing messages through `ctx.ui.notify(...)` and `ctx.ui.setStatus("pi-mcp", ...)`. Use `console.error("[pi-mcp] ...")` only as a fallback when no Pi UI context exists.
   - Buffer server `stderr` lines using `StringDecoder` (to avoid corrupting split multi-byte UTF-8 chunks) and strip unsafe terminal control sequences before rendering.
2. **No Silent Error Swallowing**:
   - Never write bare `.catch(() => {})` or empty `catch {}` blocks that hide unexpected failures.
   - Handle expected error codes explicitly (e.g., `ENOENT`, `ESRCH`, `EEXIST`). If ignoring a best-effort cleanup error on teardown is intentional, document why with an explicit `// WHY:` comment.
3. **Deterministic Resource, Subprocess & Lifecycle Cleanup**:
   - **Subprocesses**: Pass the active session `cwd` to `StdioClientTransport`. Track child PIDs as soon as the transport spawns, and ensure `_shutdown()` terminates children cleanly (`SIGTERM` $\rightarrow$ bounded wait $\rightarrow$ `SIGKILL`) before retrying a failed handshake or stopping a server.
   - **In-Flight Promises & Controllers**: Always clear `server.attempt` and `connectAttempts` entries in `finally` / `_shutdown()` blocks so cancelled or failed connections never leave permanent deadlocks or zombie aborted promises.
   - **Session Reload (`session_start`) & Shutdown (`session_shutdown`)**: Always register `session_start`, `session_shutdown`, `/mcp*` commands, and management tools even if bootstrap `loadConfig(process.cwd())` fails or finds zero servers (cross-directory sessions may load a valid `.pi/mcp.json` on `session_start`). On config reload, abort in-flight connection attempts, stop the callback server, update `ToolBridge` settings, and refresh `roots/list` `cwd`.
   - **Timeouts & Cancellation**: Always resolve effective timeouts as `server.config.requestTimeoutMs ?? settings.requestTimeoutMs`. Pass `{ timeout, signal }` to `client.connect`, `client.ping`, `client.listTools`, `client.callTool`, and OAuth discovery requests. Check `signal.aborted` between async handshake/auth steps.
   - **Health Checks & Recovery**: Never allow background health checks to stack overlapping `ping()` calls; bound each ping with a timeout and wire transport `onclose` handlers so unexpected `stdio`, `sse`, and `streamable-http` disconnects trigger recovery.
4. **Atomic `0600` Credential & Lock Persistence**:
   - Write all sensitive state files (OAuth tokens `<hash>.json`, locks `<hash>.json.lock`, and `trusted-projects.json`) with file mode `0o600` inside `0o700` directories using atomic temp-file + `fsync` + `rename` writes.
   - Coordinate multi-process silent token refreshes with active lock files and OAuth 2.1 single-use refresh token rotation (`InvalidGrantError` reload-before-invalidate). Isolate corrupt state file errors per server so one broken `<hash>.json` never crashes `mcp_status` for other servers.
5. **Security Boundaries**:
   - **Project Trust Boundary**: Never execute project-local `.pi/mcp.json` servers or allow project configs to override global servers until the project path + `.pi/mcp.json` SHA-256 fingerprint is verified in `trusted-projects.json` or confirmed via `ctx.ui.confirm`.
   - **Origin-Bound OAuth State**: Bind OAuth credential files, DCR client registrations (`token_endpoint_auth_method`, `redirect_uris`), and discovery metadata to both `serverName` and the canonical `server.config.url` so a project config with the same server name cannot leak global Bearer tokens to a different host (Confused Deputy) or break when a server URL changes.
   - **Strict URL & URI Validation**: Validate redirect URLs (`http:`/`https:` loopback with an explicit port), validate callback `state` on both success and `?error=` responses, and validate server-supplied authorization URLs (`http:`/`https:` only) before passing them to OS browser launchers (`open`, `xdg-open`, `cmd`). Always encode workspace roots with `pathToFileURL(cwd).href`. Never pass unvalidated strings to a shell.

---

## 4. TypeScript, Schema & Protocol Idioms

1. **Zod Validation at Every External Boundary**:
   - Parse and validate all external data (`mcp.json`, stored OAuth JSON, lock records, DCR metadata) with Zod schemas. Never trust raw `JSON.parse(...) as SomeType`.
   - Wrap config file parse/read errors in `McpError(..., "config")` including the offending file path. Validate `toolPrefix` (`^[a-zA-Z][a-zA-Z0-9_]*$`) and reject invalid `auth` combinations (such as `oauth` on `stdio` servers) at config load time.
2. **TypeBox & LLM Tool Schema Compatibility**:
   - When converting MCP JSON Schemas to TypeBox in [`src/tool-bridge.ts`](src/tool-bridge.ts):
     - Account for Pi's `Value.Convert(schema, args)` coercion semantics: never emit union ordering where `Type.String()`, `Type.Number()`, `Type.Integer()`, or `Type.Boolean()` precedes `Type.Null()`, as `Value.Convert` will coerce `null` into `""`, `0`, or `false`.
     - Preserve object `properties` when top-level `anyOf` / `oneOf` / `allOf` constraints are present, and emit `{ type: "object", properties: {} }` (not `patternProperties`) for empty object schemas so Gemini and OpenAI accept them.
     - Track visited `$ref` pointers (`seenRefs`) along the active resolution path to prevent exponential blowup on recursive schemas, and preserve `integer`, `enum`, `const`, tuple `items`, and numeric/string constraints.
3. **Accurate Error & OAuth Classification**:
   - Classify errors using `McpError` (`config | connection | auth | timeout | protocol`) and OAuth subclasses (`AuthRequiredError`, `AuthLockError`, `AuthCancelledError`).
   - Trigger OAuth on genuine HTTP `401` (both during `initialize` and `tools/list`) and `403` with `insufficient_scope`, without false-positiving on unrelated error messages that happen to contain the substring `"401"`.
4. **No `any` & Preserve `// WHY:` Comments**:
   - Use `unknown` with type narrowing or Zod schemas instead of `any`.
   - Preserve existing `// WHY:` comments explaining protocol edge cases, and add `// WHY:` comments whenever working around MCP SDK, TypeBox, or Pi runtime quirks.

---

## 5. Debugging, Testing & Code Review Protocol

1. **4-Step Debugging Protocol**:
   - **Step 1 — Reproduce**: Write a deterministic failing test in `tests/` that reproduces the exact bug before editing `src/`.
   - **Step 2 — Trace**: Trace the full state machine (`stopped` $\rightarrow$ `starting` $\rightarrow$ `ready` $\rightarrow$ `failed`, plus abort, reload, and multi-process interleavings) rather than patching surface symptoms.
   - **Step 3 — Fix at the Root**: Implement the fix with clean separation between pure policy and I/O adapter.
   - **Step 4 — Verify**: Run the new regression test plus the full test suite and typechecker.
2. **Test Structure**:
   - Name tests descriptively (`should <expected behavior> when <condition>`).
   - Follow Arrange–Act–Assert (AAA).
   - Prefer deterministic fake clocks/promises/transports over wall-clock `setTimeout` delays.
3. **Pre-Commit Code Review Checklist**:
   - [ ] **Lifecycle & Concurrency**: Are all in-flight promises (`server.attempt`, `connectAttempts`), timers, child processes, and abort listeners cleaned up on error, reload, and cancellation paths?
   - [ ] **TUI & Error Handling**: Does any code path write to `stdout` or swallow errors with a bare `.catch(() => {})`?
   - [ ] **Security & Credentials**: Are external inputs validated with Zod, URLs scheme-checked, and credentials/locks origin-bound and written atomically with `0o600`?
   - [ ] **Verification Gates**: Do `npm run typecheck`, `npm test`, and `npm pack --dry-run` all pass with zero errors?

---

## 6. Git Commit & Automated Release Rules

**CRITICAL — Publish-on-Push is Active on `main`:**
[`.github/workflows/publish.yml`](.github/workflows/publish.yml) runs automatically on every push to `main` and publishes to npm based on Conventional Commit prefixes since the last git tag:

| Commit Prefix | npm Version Bump | Requirement |
|---|---|---|
| `fix:` or `perf:` | **Patch** (`1.9.x`) | Must leave `main` releasable + update `## [Unreleased]` in `CHANGELOG.md` |
| `feat:` | **Minor** (`1.x.0`) | Must leave `main` releasable + update `## [Unreleased]` in `CHANGELOG.md` |
| `<type>!:` or `BREAKING CHANGE:` | **Major** (`x.0.0`) | Must leave `main` releasable + update `## [Unreleased]` in `CHANGELOG.md` |
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:` | **None** (`bump=none`) | Use for non-release commits (e.g., `AGENTS.md`, test-only, internal refactors) |

When preparing a `feat:`, `fix:`, or `perf:` commit/PR, always add a concise user-facing entry under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md); the release workflow automatically stamps `## [Unreleased]` with the new version number and date during publishing.
