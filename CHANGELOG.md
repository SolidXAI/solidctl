# Changelog

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
