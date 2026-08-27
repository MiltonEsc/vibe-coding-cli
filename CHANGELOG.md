# Changelog

All notable changes to Vibe CLI will be documented in this file.

The project follows semantic versioning for published npm releases.

## [0.4.0] - 2026-08-27

### Added

- Vibe project schema v2 with a configurable, path-safe `artifactsDirectory`.
- `vibe migrate [directory] [--dry-run]` for explicit schema v1 to v2 migration.
- `vibe next [directory] [--json]` to identify the current stage, artifact, recommended Skill, blockers, validation command, and accountable approval action.
- Central artifact resolution shared by scaffold, workflow, doctor, and migration.

### Changed

- New projects store the nine workflow artifacts under `.vibe/artifacts/` instead of the repository root.
- New projects create only `.agents/` and `.vibe/` as root directories; application and infrastructure directories are created later from approved architecture.
- Initial cross-stack root files are limited to `.gitignore`, `AGENTS.md`, and `README.md`; contribution, security-policy, and environment-example files are deferred until project decisions exist.
- Generated `AGENTS.md`, nested guidance, project README, and first-party Skills reference the schema v2 artifact paths.
- Initialization and dry-run lead with decisions and the next three steps; `--verbose` lists every planned file path.
- Workflow verification reports approval integrity separately from completion progress, including `0/8 stages approved; incomplete` for a fresh project.
- Command-specific help is available for workflow and Skills subcommands.
- Preset help explains the selected technologies, while no preset explicitly defers stack decisions to architecture.
- Schema v1 projects remain supported by doctor and all workflow commands.

### Security

- Migration moves only known Vibe artifacts and rejects collisions, unsafe evidence, traversal, absolute paths, and symlinked artifact directories.
- Approved SHA-256 evidence is retained while trusted paths are transformed during migration.
- Migration uses preflight checks, temporary metadata files, and best-effort rollback without executing repository commands.

## [0.3.0] - 2026-08-26

### Added

- Team-safe workflow verification with derived `verified`, `drifted`, and `invalid` integrity states.
- `vibe workflow verify [--json]` with a non-zero exit code for approval drift or ledger inconsistency.
- `vibe workflow history [stage] [--json]` for approval, replacement, drift, and reopen audit events.
- Optional Git commit, branch, and clean-working-tree evidence on stage approvals.
- Reopen actor attribution through `--actor` while preserving compatibility when omitted.
- Team Workflow documentation and a CI governance example.

### Changed

- `vibe doctor` now reports structured approval drift with approved/current hashes and a recommended explicit reopen command.
- `vibe workflow status` now displays derived approval integrity.
- Approval revalidates artifacts and the workflow ledger immediately before atomic persistence to reject concurrent changes.
- Generated `AGENTS.md`, contribution guidance, the orchestrator, and stage Skills now enforce approved-contract and task-scope discipline.

### Security

- Approved contracts can no longer change silently while retaining a passing workflow integrity check.
- Downstream approval is blocked when an upstream stage is pending, invalid, or drifted.
- Runtime dependencies remain at zero; Git context collection is optional and uses the local Git executable.

## [0.2.0] - 2026-08-25

### Added

- Optional stack selection and support for custom lowercase stack identifiers.
- Presets for full-stack, web, API, mobile, and documentation-first projects.
- 16 bundled first-party Skills covering orchestration, delivery stages, and supported stacks.
- Hierarchical `AGENTS.md` generation for repositories and selected subprojects.
- A complete `design.md` experience contract.
- Ordered workflow approvals for requirements, architecture, database, backend, frontend, testing, review, and deployment.
- Workflow reopen support with downstream approval invalidation and history tracking.
- `vibe doctor` diagnostics and machine-readable JSON output.
- Skill listing, bundled Skill installation, catalog browsing, remote installation, and auditing commands.
- Secure remote Skill installation with HTTPS enforcement, host allowlisting, redirect validation, size limits, SHA-256 verification, static audit, provenance tracking, and atomic installation.
- Prompt and prompt-file support for preserving the original product brief.
- npm publication under `@vibe-coding-cli/cli`.

### Security

- Reject executable, binary-prone, unsafe, and checksum-mismatched remote Skill content.
- Prevent path traversal and installation outside controlled staging and destination directories.
- Keep `vibe init` free of automatic framework installation and remote script execution.

## [0.1.0] - 2026-08-25

### Added

- Initial Vibe CLI implementation.
- Project scaffolding, workflow artifacts, first-party Skills, and core validation commands.

[0.4.0]: https://github.com/MiltonEsc/vibe-coding-cli/releases/tag/v0.4.0
[0.3.0]: https://github.com/MiltonEsc/vibe-coding-cli/releases/tag/v0.3.0
[0.2.0]: https://github.com/MiltonEsc/vibe-coding-cli/releases/tag/v0.2.0
[0.1.0]: https://github.com/MiltonEsc/vibe-coding-cli/releases/tag/v0.1.0
