# Changelog

All notable changes to Vibe CLI will be documented in this file.

The project follows semantic versioning for published npm releases.

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

[0.2.0]: https://github.com/MiltonEsc/vibe-coding-cli/releases/tag/v0.2.0
[0.1.0]: https://github.com/MiltonEsc/vibe-coding-cli/releases/tag/v0.1.0
