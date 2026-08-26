# Contributing to Vibe CLI

Thanks for helping improve Vibe CLI.

## Development requirements

- Node.js 22 or newer.
- npm.
- TypeScript is installed through the repository dev dependencies.

## Local setup

```bash
git clone https://github.com/MiltonEsc/vibe-coding-cli.git
cd vibe-coding-cli
npm ci
npm run check
```

## Development workflow

Create a focused branch from `main`, declare the task scope and approved contracts being consumed, make the smallest coherent change, update or add tests, and run the full check before opening a pull request.

```bash
git checkout -b feat/my-change
npm run check
```

For a Vibe-governed project, run `vibe workflow verify` before implementation and again before opening the pull request. Never modify an approved upstream artifact as a side effect. If the task requires a contract change, stop and request explicit authorization to reopen that stage with an accountable actor and reason.

For CLI behavior, you can run the compiled command directly:

```bash
npm run build
node dist/cli.js --help
```

To test scaffolding without writing a project:

```bash
node dist/cli.js init sample-project --preset full-stack --dry-run
```

## Testing expectations

Changes that affect workflow gates, generated project structure, stack selection, security controls, remote Skill installation, or CLI parsing should include regression coverage in `test/`.

The project uses Node's built-in test runner. The main validation command is:

```bash
npm run check
```

## Security-sensitive changes

Treat changes involving remote URLs, redirect handling, checksums, filesystem paths, Skill auditing, symlinks, executable detection, atomic installation, and workflow approvals as security-sensitive.

Do not weaken these guarantees without explicit justification and tests:

- HTTPS-only remote Skill sources.
- Host allowlisting and redirect revalidation.
- Path containment.
- SHA-256 verification.
- Size limits.
- Executable and binary rejection.
- Audit-before-install behavior.
- Atomic installation.
- Approval ordering and downstream invalidation.
- Approval drift detection and optimistic approval checks.

Never add automatic dependency installation or arbitrary remote execution to `vibe init`.

## Pull requests

A good pull request should:

- Explain the problem and the intended behavior.
- Keep unrelated changes out of the diff.
- Include tests for behavior changes.
- Update README or other docs when commands or user-facing behavior change.
- Pass CI on all supported Node.js versions.

## Commit style

Short Conventional Commit-style subjects are encouraged, for example:

```text
feat: add stack selector
fix: reject unsafe skill path
ci: test Node 24
chore: prepare npm release
```

## Reporting security issues

Please follow the process described in `SECURITY.md` instead of opening a public issue for a suspected vulnerability.
