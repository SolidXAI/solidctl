# solidctl CLI usage (SolidX developer workflow)

Package: @solidxai/solidctl

This document lists the exact commands exposed by `solidctl` and practical usage examples for SolidX developers.

## Prerequisites

- Run `solidctl` from the **SolidX project root** (must contain `solid-api/package.json` and `solid-ui/package.json`).
- Node + npm installed.

## Commands

### 1) build

Builds the Solid API, sets up a `solid` shim in `~/.solidctl/bin`, and makes the `solid` CLI available locally (and globally if a writable PATH dir is found).

Usage:

```bash
npx @solidxai/solidctl build
```

Example workflow:

```bash
# from your SolidX project root
solidctl build

# verify the shim works (build already does this internally)
solid --help
```

---

### 2) upgrade

Upgrades Solid dependencies used by both `solid-api` and `solid-ui`.

Usage:

```bash
npx @solidxai/solidctl upgrade [--dry-run]
```

Examples:

```bash
# run all upgrade commands using the latest beta release
solidctl upgrade

# upgrade to the latest alpha release
solidctl upgrade --alpha

# upgrade to the latest stable release
solidctl upgrade --stable

# preview the commands without executing
solidctl upgrade --dry-run
```

What it runs (in order):

- `npm upgrade @solidxai/core` in `solid-api`
- `npm upgrade @solidxai/code-builder` in `solid-api`
- `npm upgrade @solidxai/core-ui` in `solid-ui`
- `npm run postinstall` in `solid-ui`

---

### 3) local-upgrade

Installs local, checked-out Solid packages into your project by running `npm pack` on each repo and installing the resulting `.tgz` into the SolidX project.

Required environment variables:

- `SOLID_CORE_MODULE_PATH` (path to solid-core repo)
- `SOLID_UI_PATH` (path to solid-ui repo)
- `SOLID_CODE_BUILDER_PATH` (path to solid-code-builder repo)

Usage:

```bash
npx @solidxai/solidctl local-upgrade [--core] [--ui] [--code-builder]
```

Examples:

```bash
# upgrade all three packages (default when no flags passed)
export SOLID_CORE_MODULE_PATH=~/code/solid-core
export SOLID_UI_PATH=~/code/solid-ui
export SOLID_CODE_BUILDER_PATH=~/code/solid-code-builder
npx @solidxai/solidctl local-upgrade

# upgrade only solid-core
npx @solidxai/solidctl local-upgrade --core

# upgrade only solid-ui
npx @solidxai/solidctl local-upgrade --ui

# upgrade only solid-code-builder
npx @solidxai/solidctl local-upgrade --code-builder
```

Notes:

- Packages are packed in-place and copied into `solid-api/local_packages` or `solid-ui/local_packages` before installing.
- If you pass no flags, **all** packages are installed.

---

### 4) seed

Bootstraps SolidX metadata, settings, and the system user by running the `solid` CLI’s `seed` command inside `solid-api`.

Usage:

```bash
npx @solidxai/solidctl seed [-s|--seeder <seeder-name>] [-c|--conf <json-string>]
```

Options:

- `-s, --seeder` The seeder to run. Default: `ModuleMetadataSeederService`
- `-c, --conf` A JSON string passed through to the `solid seed` command

Examples:

```bash
# run the default seeder
solidctl seed

# pass a JSON config string
solidctl seed --conf "{\"modulesToSeed\": [\"onboarding\"]}"

```

---

### 5) start:dev

Runs both consuming-project dev servers in one supervised terminal session.

Usage:

```bash
npx @solidxai/solidctl start:dev [--plain]
```

What it runs:

- `npm run solidx:dev` in `solid-api`
- `npm run solidx:dev` in `solid-ui`

Interactive shortcuts:

- `a` restart API only
- `u` restart UI only
- `r` restart both
- `c` clear the terminal
- `q` quit

Notes:

- Must be run from the SolidX project root.
- Both `solid-api/package.json` and `solid-ui/package.json` must define `scripts.solidx:dev`.
- `--plain` disables the pinned control footer and prints merged logs only.

---

### 7) mcp install

Installs the SolidX MCP server into all supported AI coding agents on your machine (Claude Code, Cursor, Codex, Claude Desktop) across macOS, Linux, and Windows. Idempotent; backs up any config file it overwrites.

Usage:

```bash
npx @solidxai/solidctl mcp install [options]
```

Options:

- `--project <name>` Consuming project name (kebab-case). Default: derived from cwd basename when cwd is a SolidX project root.
- `--api-key <key>` Override the API key read from `~/.solidx/<project>/mcp.json` (must start with `sldx_`).
- `--url <url>` MCP server URL (default: `http://localhost:9000/mcp`).
- `--name <server>` Override the generated entry name (default: `solidx-<project>-mcp`).
- `--agents <list>` Comma-separated subset: `claude-code,cursor,codex,claude-desktop`. Default: all detected agents.
- `--dry-run` Print planned changes, touch nothing.
- `--force` Re-write even when an identical entry already exists.

Examples:

```bash
# from inside a SolidX project root — uses the project's key
solidctl mcp install

# explicit project name + url + agent subset
solidctl mcp install --project new-todo-app --url http://localhost:9000/mcp --agents cursor,codex

# preview changes only
solidctl mcp install --dry-run
```

Notes:

- The API key is read from `~/.solidx/<project>/mcp.json` (written by `solidctl create-app`). Missing keys fail fast with a pointer to run `create-app` first.
- Entries are named `solidx-<project>-mcp` so multiple SolidX projects can coexist in one agent config.
- Prefer each agent's official CLI (`claude mcp`, `cursor mcp`, `codex mcp`) when available; falls back to surgical config-file edits otherwise.
- Claude Desktop is configured via a stdio bridge using `npx -y mcp-remote`; on Windows the entry wraps `npx` in `cmd /c`.
- The MCP server itself must be started separately via `solidctl mcp start`.

---

## Common help

```bash
solidctl --help
solidctl <command> --help
```
