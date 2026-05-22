# Changelog

## [0.1.38] - 2026-05-22

### Other

- changes to allow releasing solid-code-builder as well using solidctl

## [0.1.36] - 2026-05-22

### Fixed

- Fix `solidctl agent start` failure when `uv` is used for venv management. The `uv venv` command does not include `pip` by default, and `uv pip install --python` expects a Python interpreter path rather than the `pip` binary path. Added `--seed` to `uv venv` calls so `pip` is included, and corrected the `--python` argument to use the venv's Python interpreter path instead of the nonexistent `pip` path.

## [0.1.35] - 2026-05-22

### Other

- upgraded version
