# Changelog

## [0.1.50-beta.1] - 2026-08-31

### Added

- add core module icon provisioning and sync functionality

### Fixed

- update sync-core-module-assets script to include all resource files
- update sync-core-module-assets script to reference correct image path
- update postinstall script to sync all core module assets

### Changed

- remove syncCoreModuleIcon function and related references; add postinstall script for core module icon

## [0.1.50-beta.0] - 2026-08-25

### Changed

- simplify migration command options and remove unused functionality

### Other

- changes to release command to support --from <version> and --from-dev to release main from a particular beta version of dev or latest on dev

## [0.1.49] - 2026-08-20

## [0.1.48] - 2026-08-20

### Added

- enhance runReleaseValidationTestCommand to support progress indication in TTY environments
- update release project resolution to include core modules
- added release support for solidx modules

### Other

- getting rid of this from solidctl since chromium now gets installed during first ui test run lazily instead
- removed redis-store since it is not being used in solid-core now. backwards compatible safe, since this dependency was already present in solid-core so it should be provided transitively anyways
- add_changelog_for_prerelease
- changed references in solidctl

## [0.1.48-beta.5] - 2026-08-14

### Other

- getting rid of this from solidctl since chromium now gets installed during first ui test run lazily instead
- removed redis-store since it is not being used in solid-core now. backwards compatible safe, since this dependency was already present in solid-core so it should be provided transitively anyways

## [0.1.48-beta.4] - 2026-07-31

### Added

- enhance runReleaseValidationTestCommand to support progress indication in TTY environments

## [0.1.48-beta.3] - 2026-07-29

### Added

- update release project resolution to include core modules

### Other

- add_changelog_for_prerelease

## [0.1.47] - 2026-07-09

### Fixed

- include SOURCE_TEMPLATE_FOLDER_UI_MODULE in exclude template paths to avoid copying it in the final output

## [0.1.46] - 2026-07-09

### Added

- orchestrator + `solidctl mcp install` registration
- Claude Code installer (CLI-first, JSON fallback)
- Codex installer (CLI hybrid + surgical TOML edit)
- Cursor installer (CLI-first, JSON file fallback)
- Claude Desktop installer (OS-branched stdio bridge)
- per-OS config paths, commandExists, backupFile
- shared types and agent-list parsing

### Fixed

- add missing datasource file pattern to nodemon ignore list

### Changed

- detect solidx version and tag and accordingly install the corresponding depdency tags

### Documentation

- document `solidctl mcp install`

### Maintenance

- update package.json to add @codemirror/view dependency Changes to handle bootsrap even if synchronize flag is set to no Ticket: synchronize question changes

### Other

- removed embedded db option
- Add dev port validation for create-app and start commands.
- Detect Cursor Desktop independently of mcp.json existence
- changes to ask for upgrades only if it is an interactive session otherwise for non interactive session, keep upgrade as false
- added a generate ui-module sub-command only used by embedded db
- Add database verification logic to create-app command Ticket description: Create solid app database issue
- Extract MCP launch logic and integrate MCP into start supervisor
- remove comments
- added postinstall post upgrading ui, to ensure themes are copied properly
- added metadata folder to nodemon ignore path
- version check added before verifying project root
- added agent and mcp auto version check and update feature
- added version check for agent and mcp sub commands
- move code from generation to migration file
- restricted db pool again to 1 for embedded db as it was causing "unnamed prepared statement does not exist" error
- add new command and make url encoded

## [0.1.45] - 2026-06-24

### Added

- enhance StartSupervisor to support selective service supervision
- implement force kill mechanism for child processes in StartSupervisor

### Fixed

- update isInteractive logic and enhance controls option description

### Other

- revert setting db pool max to 1 for embedded DB

## [0.1.43] - 2026-06-22

### Added

- add embedded PGlite database for zero-config onboarding

### Other

- package json changes in ui template

## [0.1.42] - 2026-06-20

### Other

- changes to new module metadata path in readme
- Enhance start command to support plain option and add standard process command
- tailwind related changes added to boilder palte
- Add migration command for TypeORM workflows and update start command options
- Favicon provider added
- adding the FRONTEND_BASE_URL to the bridged envs
- changes to install chromium before running the tests. This is a fallback if chromium is not installed, since we are not packaging chromium in our package.json to avoid bloated dependency size, since some clients might never run the tests
- handled DATABASE_URL formation for mssql and mysql databases

## [0.1.41] - 2026-05-25

### Other

- changes to clean up the app creation console output
- changes to use the ctl start:dev command as part of create-app
- app title .env boilerplate: https://erp2.logicloop.io/web#cids=1&menu_id=167&action=256&active_id=23&model=project.task&view_type=form&id=11478
- added --no-deprecation arguments to avoid deprecation warnings during backend startup

## [0.1.40] - 2026-05-25

### Other

- added overrides to circumwent issue around eslint and code mirror libraries
- changes to automate build and seed. Also added option to upgrade to beta as part of the setup

## [0.1.39] - 2026-05-23

### Other

- generate command cleanup
- changes to scaffold the ui module too as part of generate module with model extension conventions documented in the module and readme file

## [0.1.38] - 2026-05-22

### Other

- release version fix

## [0.1.38] - 2026-05-22

### Other

- changes to allow releasing solid-code-builder as well using solidctl

## [0.1.36] - 2026-05-22

### Fixed

- Fix `solidctl agent start` failure when `uv` is used for venv management. The `uv venv` command does not include `pip` by default, and `uv pip install --python` expects a Python interpreter path rather than the `pip` binary path. Added `--seed` to `uv venv` calls so `pip` is included, and corrected the `--python` argument to use the venv's Python interpreter path instead of the nonexistent `pip` path.

## [0.1.35] - 2026-05-22

### Other

- upgraded version
