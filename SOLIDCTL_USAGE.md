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
npx @solidxai/solidctl start:dev [--controls]
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

### 6) migration

Runs datasource-specific TypeORM migrations from the SolidX project root.

Usage:

```bash
npx @solidxai/solidctl migration -d <datasource> -m <module> generate <MigrationName>
npx @solidxai/solidctl migration -d <datasource> run
npx @solidxai/solidctl migration -d <datasource> revert
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

## Common help

```bash
solidctl --help
solidctl <command> --help
```
