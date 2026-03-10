# solidctl

> The developer CLI for the SolidX platform — scaffold, build, seed, generate, and release your SolidX application from a single tool.

`solidctl` is the command-line interface that ties the SolidX ecosystem together. Whether you are starting a new project, upgrading core dependencies, or regenerating code after a model change using the command line, `solidctl` is the entry point.

[![npm version](https://img.shields.io/npm/v/@solidxai/solidctl)](https://www.npmjs.com/package/@solidxai/solidctl)
[![License: BSL-1.1](https://img.shields.io/badge/License-BSL--1.1-blue.svg)](https://opensource.org/licenses/BSL-1.1)
[![Documentation](https://img.shields.io/badge/docs-solidxai.com-blue)](https://docs.solidxai.com/docs)

---

## Usage

The recommended way to run `solidctl` is via `npx`, which ensures you are always using the latest version without needing a global install:

```bash
npx @solidxai/solidctl <command>
```

All examples in this README use `npx`. If you prefer a global install:

```bash
npm install -g @solidxai/solidctl
solidctl <command>
```

However please note that a global install may become outdated, so we recommend using `npx` for the best experience.

---

## Quick start

Scaffold a new SolidX project with a single command:

```bash
npx @solidxai/solidctl create-app
```

The interactive wizard will ask for your project name, database connection details, and port configuration, then scaffold a complete project structure:

```
my-solid-app/
├── solid-api/    # NestJS backend powered by @solidxai/core
└── solid-ui/     # React frontend powered by @solidxai/core-ui
```

Once created, build the API and bootstrap the database:

```bash
cd my-solid-app
npx @solidxai/solidctl build   # compiles solid-api and sets up the local solid CLI
npx @solidxai/solidctl seed    # seeds the database with SolidX metadata and system defaults
```

---

## Commands

### `create-app`

Scaffolds a new SolidX project. Runs an interactive setup wizard by default; all options can also be passed as flags for non-interactive use.

```bash
npx @solidxai/solidctl create-app [options]
```

| Flag | Default | Description |
|---|---|---|
| `--name <name>` | `my-solid-app` | Project directory name |
| `--api-port <port>` | `3000` | Port for the NestJS API |
| `--ui-port <port>` | `3001` | Port for the React frontend |
| `--db-client <client>` | `postgres` | Database client (`postgres`, `mysql`, etc.) |
| `--db-host <host>` | `localhost` | Database host |
| `--db-port <port>` | `5432` | Database port |
| `--db-name <name>` | `solidx_app_db` | Database name |
| `--db-username <user>` | `solidx_app_user` | Database username |
| `--db-password <pass>` | `strongpassword` | Database password |
| `--db-synchronize` | `false` | Enable TypeORM schema auto-sync |
| `--no-interactive` | — | Skip prompts and use flag values / defaults |

---

### `build`

Builds the NestJS API and sets up the local `solid` CLI shim so subsequent `solidctl` commands that proxy into the API (like `seed`, `generate`, and `test`) work correctly. Run this after project creation and after any changes to `solid-api`.

```bash
npx @solidxai/solidctl build
```

This command:
1. Runs `npm run build` inside `solid-api/`
2. Creates a local `solid` CLI shim that points to the compiled output
3. Verifies the shim is working correctly

> Must be run from the project root (the directory containing both `solid-api/` and `solid-ui/`).

---

### `seed`

Seeds the database with SolidX system metadata, permissions, default settings, and the initial admin user. Run once after the database is created and after any module metadata changes.

```bash
npx @solidxai/solidctl seed
```

Proxies to the `solid seed` command inside `solid-api/`. Any additional arguments are passed through.

---

### `generate`

Regenerates NestJS boilerplate (entity, service, controller, repository, DTOs) for a model or an entire module based on the current metadata. Safe to run repeatedly — existing custom logic in generated files is preserved.

```bash
# Regenerate a single model and its related models
npx @solidxai/solidctl generate model <model-name>

# Regenerate all models within a module
npx @solidxai/solidctl generate module <module-name>
```

Under the hood, this proxies to `solid refresh-model` / `solid refresh-module`, which invokes `@solidxai/code-builder` to perform AST-level file updates.

---

### `upgrade`

Upgrades the core SolidX dependencies in both `solid-api` and `solid-ui` to the latest available version.

```bash
# Upgrade to the latest beta pre-release (default)
npx @solidxai/solidctl upgrade

# Upgrade to the latest stable release
npx @solidxai/solidctl upgrade --stable

# Upgrade to a specific dist-tag
npx @solidxai/solidctl upgrade --tag next

# Preview what would change without installing
npx @solidxai/solidctl upgrade --dry-run
```

Packages upgraded:
- `solid-api`: `@solidxai/core`, `@solidxai/code-builder`
- `solid-ui`: `@solidxai/core-ui`

---

### `test`

Runs the SolidX metadata-driven test suite defined in your module metadata. Proxies to `solid test` inside `solid-api/`.

```bash
npx @solidxai/solidctl test [args]
```

All arguments are passed through to the underlying `solid test` command. See the [testing framework documentation](https://docs.solidxai.com/docs) for details on writing test scenarios.

---

### `info`

Prints information about the current SolidX project — versions, configuration, and environment. Useful for debugging and support.

```bash
npx @solidxai/solidctl info
```

---

## Project structure

A project created by `solidctl create-app` follows this layout:

```
my-solid-app/
├── solid-api/                  # NestJS backend
│   ├── src/
│   │   ├── app.module.ts       # Root module importing SolidCoreModule
│   │   ├── main.ts             # Application entry point
│   │   └── {your-modules}/     # Generated modules live here
│   ├── module-metadata/        # Metadata JSON files driving code generation
│   └── package.json
│
└── solid-ui/                   # React frontend
    ├── src/
    │   ├── main.tsx            # App entry point
    │   └── App.tsx             # Root component with SolidX providers
    └── package.json
```

---

## Part of the SolidX Platform

`solidctl` is the developer interface to the full SolidX package ecosystem:

| Package | Role |
|---|---|
| [`@solidxai/core`](https://www.npmjs.com/package/@solidxai/core) | NestJS backend module — auth, CRUD, IAM, notifications, queues |
| [`@solidxai/core-ui`](https://www.npmjs.com/package/@solidxai/core-ui) | React admin panel — metadata-driven views, auth UI, Redux store |
| [`@solidxai/code-builder`](https://www.npmjs.com/package/@solidxai/code-builder) | Code generation engine — produces NestJS files from metadata |
| `@solidxai/solidctl` | This CLI — scaffolds, builds, generates, and upgrades |

| | |
|---|---|
| Website | [solidxai.com](https://solidxai.com) |
| Documentation | [docs.solidxai.com](https://docs.solidxai.com/docs) |
| Support | support@solidxai.com |

---

## License

BSL-1.1 © [Logicloop](https://logicloop.io)
