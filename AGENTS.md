# AGENTS.md

## Project overview

Vibe CLI is a zero-runtime-dependency Node.js 22 command-line tool written in TypeScript and distributed as compiled ESM. It creates AGENTS.md-driven project structures, gated delivery artifacts, first-party Skills, and checksum-verified optional remote Skill installation.

## Source layout

- `src/`: TypeScript implementation.
- `templates/skills/`: first-party Skill packages.
- `registry/skills.json`: reviewed remote Skill catalog and checksums.
- `test/`: Node test runner suites.
- `dist/`: compiled distributable JavaScript.

## Commands

- Build: `npm run build`
- Test: `npm test`
- Full check: `npm run check`
- Local CLI: `node dist/cli.js --help`
- Sample scaffold: `node dist/cli.js init /tmp/vibe-sample --preset full-stack`

## Conventions

- Keep runtime dependencies at zero unless a concrete security and maintenance review justifies one.
- Use Node.js native APIs and ESM.
- Preserve strict path containment, checksum verification, size limits, no-executable policy, audit-before-install, and atomic remote Skill installation.
- Resolve workflow artifacts through project configuration; schema v1 uses the root and schema v2 uses the validated `artifactsDirectory`.
- Never add automatic dependency installation or remote execution to `vibe init`.
- Update tests for workflow gates, security controls, scaffold structure, and CLI parsing.
- Keep Skill frontmatter to `name` and `description`; use lowercase kebab-case names.
- Run the skill-creator validator before packaging a first-party Skill.
- Treat approved stage artifacts as immutable contracts for downstream work. Run `vibe workflow verify` before implementation and never modify an approved upstream contract as a side effect.
- State the task scope, allowed files or areas, and consumed contracts before implementation. Stop and request an explicit reopen when the requested work requires a contract change.
- Use focused branches and pull requests for consequential changes; Vibe verifies contracts while Git coordinates collaboration and review.

## Security review requirements

Treat changes to `registry/skills.json`, URL handling, filesystem paths, hashing, audit patterns, and workflow approvals as security-sensitive. Review redirects, symlinks, path traversal, partial writes, replacement behavior, and fail-open conditions.
