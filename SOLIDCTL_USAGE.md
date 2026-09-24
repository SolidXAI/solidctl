# solidctl CLI usage (SolidX developer workflow)

Package: @solidxai/solidctl

This document lists the exact commands exposed by `solidctl` and practical usage examples for SolidX developers.

## Prerequisites

- Run `solidctl` from the **SolidX project root** (must contain `solid-api/package.json` and `solid-ui/package.json`).
- Node + npm installed.

## Commands

### 1) setup-app

Sets up an already-bootstrapped SolidX project you've just cloned: installs dependencies, configures `.env`, verifies/creates the database, builds, seeds, and starts the dev servers — all in one command. This is the counterpart to `create-app` for a project that already exists rather than one being scaffolded from scratch.

Usage:

```bash
solidctl setup-app [options]
```

Options:

- `--no-start` Skip starting the dev servers after setup finishes
- `--no-interactive` Skip all prompts and use defaults / flags
- `--verbose` Show detailed `npm install` logs
- `--skip-install` / `--skip-build` / `--skip-seed` Skip that step
- `--force-env` Regenerate `.env` files even if they already exist
- `--db-client <client>`, `--db-host <host>`, `--db-port <port>`, `--db-name <name>`, `--db-username <username>`, `--db-password <password>`

Examples:

```bash
# from a freshly cloned SolidX project
solidctl setup-app

# non-interactive, e.g. in CI
solidctl setup-app --no-interactive --db-password "$DB_PASSWORD" --no-start
```

Notes:

- Project name and UI port are inferred from `solid-api/package.json` and `solid-ui/package.json` — you're only prompted for the database connection.
- If `solid-api/.env` already exists, it's left untouched. If a `solid-api/.env.example` exists, its values are carried over and only the gaps and the password are prompted for.
- Both `solid-api/package.json` and `solid-ui/package.json` must define a `solidx:dev` script; if either predates that script, setup fails fast and names the exact line to add.
- See [Environment variables](#environment-variables) below for what setup writes into `.env`.

---

### 2) build

Builds the Solid API, sets up a `solid` shim in `~/.solidctl/bin`, and makes the `solid` CLI available locally (and globally if a writable PATH dir is found).

Usage:

```bash
solidctl build
```

Example workflow:

```bash
# from your SolidX project root
solidctl build

# verify the shim works (build already does this internally)
solid --help
```

---

### 3) upgrade

Upgrades Solid dependencies used by both `solid-api` and `solid-ui`.

Usage:

```bash
solidctl upgrade [--dry-run]
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

### 4) local-upgrade

Installs local, checked-out Solid packages into your project by running `npm pack` on each repo and installing the resulting `.tgz` into the SolidX project.

Required environment variables:

- `SOLID_CORE_MODULE_PATH` (path to solid-core repo)
- `SOLID_UI_PATH` (path to solid-ui repo)
- `SOLID_CODE_BUILDER_PATH` (path to solid-code-builder repo)

Usage:

```bash
solidctl local-upgrade [--core] [--ui] [--code-builder]
```

Examples:

```bash
# upgrade all three packages (default when no flags passed)
export SOLID_CORE_MODULE_PATH=~/code/solid-core
export SOLID_UI_PATH=~/code/solid-ui
export SOLID_CODE_BUILDER_PATH=~/code/solid-code-builder
solidctl local-upgrade

# upgrade only solid-core
solidctl local-upgrade --core

# upgrade only solid-ui
solidctl local-upgrade --ui

# upgrade only solid-code-builder
solidctl local-upgrade --code-builder
```

Notes:

- Packages are packed in-place and copied into `solid-api/local_packages` or `solid-ui/local_packages` before installing.
- If you pass no flags, **all** packages are installed.

---

### 5) seed

Bootstraps SolidX metadata, settings, and the system user by running the `solid` CLI’s `seed` command inside `solid-api`.

Usage:

```bash
solidctl seed [-s|--seeder <seeder-name>] [-c|--conf <json-string>]
```

Options:

- `-s, --seeder` The seeder to run. Default: `ModuleMetadataSeederService`
- `-c, --conf` A JSON string passed through to the `solid seed` command
- `-v, --verbose` Show detailed Nest/Winston logs during seeding

Examples:

```bash
# run the default seeder
solidctl seed

# pass a JSON config string
solidctl seed --conf "{\"modulesToSeed\": [\"onboarding\"]}"

```

---

### 6) start:dev

Runs both consuming-project dev servers in one supervised terminal session.

Usage:

```bash
solidctl start:dev [--controls]
```

What it runs:

- `npm run solidx:dev` in `solid-api`
- `npm run solidx:dev` in `solid-ui`

Interactive shortcuts with `--controls`:

- `a` restart API only
- `u` restart UI only
- `r` restart both
- `c` clear the terminal
- `q` quit

Notes:

- Must be run from the SolidX project root.
- Both `solid-api/package.json` and `solid-ui/package.json` must define `scripts.solidx:dev`.
- By default, logs are printed without the pinned control footer.
- `--controls` enables the pinned control footer and keyboard shortcuts in interactive terminals.

---

### 7) migration

Runs datasource-specific TypeORM migrations from the SolidX project root.

Usage:

```bash
solidctl migration -d <datasource> -m <module> generate <MigrationName>
solidctl migration -d <datasource> run
solidctl migration -d <datasource> revert
```

Examples:

```bash
solidctl migration -d default -m mswipe-masters generate AddBankIfscIndexes
solidctl migration -d applications -m onboarding generate Added_PreApplication_Master
solidctl migration -d applications run
solidctl migration -d applications revert
```

Notes:

- `-d, --datasource` is required and maps to `solid-api/src/typeorm-<datasource>-datasource.ts`.
- `-m, --module` is required only for `generate`.
- Generated files are written under `solid-api/src/<module>/migrations/<datasource>/`.
- `run` and `revert` execute against the full datasource configuration, so they apply to all module migration folders wired into that datasource.

---

### 8) mcp install

Installs the SolidX MCP server into all supported AI coding agents on your machine (Claude Code, Cursor, Codex, Claude Desktop) across macOS, Linux, and Windows. Idempotent; backs up any config file it overwrites.

Usage:

```bash
solidctl mcp install [options]
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

## Environment variables

Two `solid-api/.env` keys are worth knowing about if you're debugging `setup-app` or the MCP server:

- `SOLID_CORE_DB_TYPE` — `postgres`, `mysql`, or `mssql`. Written by `solidctl setup-app` from the database client you select. Read by `solidctl mcp start` (and `solidctl agent`) to build the right `DATABASE_URL` scheme when one isn't already set. Defaults to `postgres` when absent, so existing PostgreSQL projects are unaffected.
- `DATABASE_URL` — written directly by `solidctl setup-app`. If absent, it's synthesized at runtime from the `DEFAULT_DATABASE_*` vars and `SOLID_CORE_DB_TYPE`.

---

## Common help

```bash
solidctl --help
solidctl <command> --help
```
