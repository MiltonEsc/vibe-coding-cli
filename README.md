# Vibe CLI

[![npm version](https://img.shields.io/npm/v/%40vibe-coding-cli%2Fcli)](https://www.npmjs.com/package/@vibe-coding-cli/cli)
[![npm downloads](https://img.shields.io/npm/dm/%40vibe-coding-cli%2Fcli)](https://www.npmjs.com/package/@vibe-coding-cli/cli)
[![CI](https://github.com/MiltonEsc/vibe-coding-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/MiltonEsc/vibe-coding-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen.svg)](https://nodejs.org/)

Vibe is a zero-runtime-dependency Node.js CLI that creates a safe, traceable project structure for agent-assisted software development.

It generates:

- A root `AGENTS.md` contract and reusable Skills without pre-creating application source directories.
- A complete `.vibe/artifacts/design.md` experience contract.
- Stage artifacts under `.vibe/artifacts/` for requirements, architecture, database, backend, frontend, testing, review, and deployment.
- A machine-readable workflow ledger with explicit, ordered approval gates.
- A first-party Skill library with an orchestrator and stack-specific builders.
- An opt-in remote Skill catalog with host allowlisting, size limits, SHA-256 verification, static audit, provenance, and atomic installation.

Vibe does not install frameworks or execute remote scripts during `init`. It creates the contracts and directories first so architecture, dependencies, and network access can be reviewed before code generators run.

Documentation: [GitHub Wiki](https://github.com/MiltonEsc/vibe-coding-cli/wiki) | [Wiki source](docs/wiki/Home.md) | [Team workflow guide](docs/vibe-team-workflow.md) | [Changelog](CHANGELOG.md)

## Requirements

- Node.js 22 or newer to run the packaged CLI.
- TypeScript 5.8 or newer only when rebuilding from source.

The published tarball contains compiled JavaScript and has no runtime npm dependencies.

## Quick start

Run without installing globally:

```bash
npx @vibe-coding-cli/cli init my-product --preset full-stack
cd my-product
npx @vibe-coding-cli/cli next
npx @vibe-coding-cli/cli doctor
```

Or install the CLI globally:

```bash
npm install -g @vibe-coding-cli/cli
vibe --version
vibe init my-product --preset full-stack
cd my-product
vibe next
vibe doctor
```

From this repository:

```bash
npm run build
node dist/cli.js init my-product --preset full-stack
node dist/cli.js doctor my-product
node dist/cli.js workflow status my-product
```

With no `--preset` or `--stack`, Vibe intentionally creates every delivery contract and the general Skills while deferring technology choices to the architecture stage. This is not an incomplete installation. The explicit `full-stack` preset selects Next.js, FastAPI, Supabase, and GitHub Actions and adds their specialized Skills, but it does not bootstrap source directories or install dependencies.

## Presets and stacks

```bash
vibe init my-product --preset full-stack
vibe init web-product --preset web
vibe init api-product --preset api
vibe init mobile-product --preset mobile
vibe init planning-only --preset docs
vibe init custom-product --stack nextjs,nestjs,supabase,github-actions
vibe init my-product --stack react,vite,hono,postgresql,redis,websockets --package-manager bun --prompt-file ./my-product.md
```

Known stack selectors with bundled specializations:

- `nextjs`
- `react`
- `fastapi`
- `nestjs`
- `supabase`
- `flutter`
- `github-actions`

Custom lowercase stack identifiers are accepted and recorded in `.vibe/config.json`, `AGENTS.md`, and project documentation. They use the general stage Skills and do not generate specialized validation commands. Known stacks add their bundled Skill. Vibe rejects incompatible known primary choices such as FastAPI and NestJS together, or Next.js and standalone React together.

Use `--prompt <text>` for a short brief or `--prompt-file <path>` for a substantial product prompt. The original brief is quoted in `.vibe/artifacts/requirements.md` as source material; Vibe does not guess architecture decisions or remove the review markers automatically.

`vibe init --dry-run` prints a short plan: artifact location, Skill count, stack decisions, root folders, and the next three steps. Add `--verbose` to audit every planned file.

## Generated structure

A project created with the `full-stack` preset contains this shape:

```text
my-product/
├── .gitignore
├── AGENTS.md
├── README.md
├── .vibe/
│   ├── config.json
│   ├── workflow.json
│   ├── workflow-history.jsonl        # created on the first approval event
│   ├── skills.lock.json
│   ├── provenance/
│   └── artifacts/
│       ├── requirements.md
│       ├── architecture.md
│       ├── database.md
│       ├── backend.md
│       ├── design.md
│       ├── frontend.md
│       ├── testing.md
│       ├── review.md
│       └── deployment.md
├── .agents/
│   └── skills/
│       ├── full-stack-app-builder/
│       ├── requirements-analyst/
│       ├── software-architect/
│       ├── database-designer/
│       ├── backend-builder/
│       ├── frontend-builder/
│       ├── test-engineer/
│       ├── code-reviewer/
│       ├── deployment-engineer/
│       └── selected stack Skills...
└── package.json                       # only when a selected JS stack needs it
```

The initial cross-stack root surface is limited to `.gitignore`, `AGENTS.md`, and `README.md`. The only directories Vibe creates in the repository root are `.agents/` and `.vibe/`. Application, test, infrastructure, ADR, CI, contribution, security-policy, and environment-example files are created later when approved architecture and team policy make them concrete. Teams may add deeper `AGENTS.md` files when real source boundaries exist.

### Migrating a v0.3 project

Schema v1 projects with root-level artifacts continue to work unchanged. Preview and apply the explicit schema v2 migration when ready:

```bash
vibe migrate --dry-run
vibe migrate
vibe workflow verify
```

Migration moves only the nine Vibe-managed workflow artifacts, updates approval evidence paths without changing approved checksums, and refuses destination collisions or unsafe paths. Repository-standard files remain in the root.

## Mandatory workflow

The orchestrator always follows:

```text
requirements -> architecture -> database -> backend -> frontend -> testing -> review -> deployment
```

Every stage starts as `pending`. Approval requires all prior stages to be approved and the stage artifacts to be present, meaningful, and free of scaffold markers.

```bash
vibe next
vibe workflow status
vibe workflow verify
vibe workflow approve requirements --approver "alice@example.com" --note "Product review 42"
vibe workflow approve architecture --approver "architecture-review-ci"
```

Approval records the approver, timestamp, file sizes, SHA-256 hashes, and optional Git commit, branch, and working-tree context. Immediately before persistence, Vibe rechecks the artifacts and ledger to prevent a concurrent change from receiving stale approval. An agent Skill is explicitly instructed not to approve itself.

`vibe workflow verify` derives integrity from the current files and recorded evidence. It reports approval integrity separately from progress, for example `0/8 stages approved; incomplete`. A valid empty ledger is not presented as a completed workflow. An approved artifact that changes remains `approved` but reports `drifted`; verification and `doctor` fail until a human explicitly reopens the contract.

`vibe next` connects the workflow to the agent. It shows the current stage, files to edit, recommended `$skill`, unresolved blocker count, a ready-to-use prompt, the next validation command, and the accountable approval action. The authoring agent must not approve its own work; use a different human reviewer or CI only when the team explicitly configures CI as that gate.

When an earlier decision changes, reopen that stage. Vibe invalidates all downstream approvals and appends an event to the workflow history.

```bash
vibe workflow reopen architecture --reason "Authentication boundary changed" --actor "alice@example.com"
vibe workflow history architecture
```

A stage that is not applicable still needs a completed artifact explaining why and explicit approval. It is never skipped silently.

## Team development with AI agents

Vibe recommends **Contract-First + Branch-by-Task + PR-Gated + Explicit Reopen**:

```text
Developer A + Agent A     Developer B + Agent B
           \                 /
            approved contracts
                    |
             focused branches
                    |
              pull requests
                    |
       vibe workflow verify + CI
                    |
              human review
                    |
                  main
```

- **Contract-first:** `.vibe/artifacts/requirements.md`, `.vibe/artifacts/architecture.md`, `.vibe/artifacts/database.md`, and `.vibe/artifacts/design.md` become immutable upstream contracts once approved.
- **Branch-by-task:** each developer and assistant works on a focused branch with declared scope and avoids unrelated architecture, schema, dependency, or framework changes.
- **PR-gated:** protect `main`, require pull requests, status checks, resolved conversations, and at least one accountable review. CODEOWNER review and dismissal of stale approvals are recommended.
- **Explicit reopen:** an agent that discovers a necessary contract change stops, explains the impact, and requests authorization. It never edits the ledger or runs reopen silently.

Git coordinates collaboration and merge. Vibe verifies that the contracts used by every branch still match their human approvals. See [Vibe Team Workflow](docs/vibe-team-workflow.md) for branch protection, task scope, CI, and multi-agent examples.

## `.vibe/artifacts/design.md`

The generated design contract covers:

- Product experience goals, users, and jobs to be done.
- Primary journeys and information architecture.
- Interaction and visual-system principles.
- Component inventory and all meaningful UI states.
- Forms, validation, responsiveness, accessibility, and content design.
- Data and API dependencies.
- Performance budgets, analytics, privacy constraints, decisions, and acceptance criteria.

The frontend stage requires both `.vibe/artifacts/design.md` and `.vibe/artifacts/frontend.md` before approval.

## First-party Skills

Vibe ships 16 auditable, instruction-only Skills:

### Orchestration

- `full-stack-app-builder`

### Delivery stages

- `requirements-analyst`
- `software-architect`
- `database-designer`
- `backend-builder`
- `frontend-builder`
- `test-engineer`
- `code-reviewer`
- `deployment-engineer`

### Stack-specific builders

- `nextjs-app-builder`
- `react-component-builder`
- `fastapi-api-builder`
- `nestjs-backend-builder`
- `supabase-database-builder`
- `flutter-mobile-builder`
- `github-actions-deployer`

Each first-party `SKILL.md` defines expected input, required result, project conventions, commands that may be proposed, safety boundaries, workflow, validation criteria, and handoff. Each Skill also includes `agents/openai.yaml` metadata.

Only Skills relevant to the selected project stack are copied during `init`. Add another bundled Skill later with:

```bash
vibe skills bundled
vibe skills add flutter-mobile-builder
```

## Remote Skills: secure by default

Remote installation is optional and never runs during project creation.

```bash
vibe skills catalog
vibe skills install openai/frontend-testing-debugging
vibe skills install github/create-agentsmd
```

The initial catalog uses current source files from:

- OpenAI Plugins: `frontend-testing-debugging`
- GitHub Awesome Copilot: `create-agentsmd`

The catalog intentionally does not use the archived `openai/skills` repository as an active source.

Before installation, Vibe enforces all of these controls:

1. The entry must exist in the local reviewed catalog.
2. Every URL must use HTTPS and an allowlisted host.
3. Redirect destinations are checked again.
4. Paths are normalized and cannot escape the staging directory.
5. Per-file and total size limits are enforced.
6. Every byte must match its pinned SHA-256 checksum.
7. Symlinks, executables, binary-prone file types, and binary content are rejected.
8. Text is scanned for high-risk shell, credential-access, destructive, and prompt-injection patterns.
9. `SKILL.md` frontmatter and naming are validated.
10. The Skill is moved into place only after all checks pass.
11. Source, review date, install date, and file hashes are recorded in `.vibe/skills.lock.json` and `.vibe/provenance/`.

The upstream URLs may track a branch, but exact content is pinned in each Vibe release. If upstream bytes change, installation fails closed until the catalog is reviewed and updated.

Static checks reduce risk but do not prove that third-party instructions are harmless. Review the diff and upstream license before using a remote Skill in a sensitive repository.

## Auditing and diagnostics

```bash
vibe doctor
vibe doctor --json
vibe workflow verify
vibe workflow verify --json
vibe workflow history --json
vibe skills list
vibe skills audit
vibe skills audit --json
```

`doctor` verifies required project files, stage order, state consistency, approval hashes, project guidance, required stack Skills, and Skill audit results. Unresolved scaffold markers are warnings; approval drift, missing files, malformed workflow state, unsafe Skills, or broken stage ordering are errors. JSON output includes structured drift codes, stages, approvers, approved/current hashes, and the recommended reopen command.

## CLI reference

```text
vibe init [directory] [--preset name] [--stack a,b] [--package-manager name]
                         [--prompt text|--prompt-file path] [--force] [--dry-run] [--verbose]
vibe next [directory] [--json]
vibe migrate [directory] [--dry-run]
vibe doctor [directory] [--json]
vibe workflow status [directory] [--json]
vibe workflow verify [directory] [--json]
vibe workflow history [stage] [directory] [--json]
vibe workflow approve <stage> [directory] --approver <identity> [--note text]
vibe workflow reopen <stage> [directory] --reason <text> [--actor <identity>]
vibe skills list [directory]
vibe skills bundled
vibe skills add <name> [directory] [--force]
vibe skills audit [directory] [--json]
vibe skills catalog [--json]
vibe skills install <catalog-id> [directory] [--force]
```

## Development

```bash
npm run build
npm test
npm run check
```

Tests use Node's built-in test runner. There are no runtime dependencies and no install-time lifecycle scripts.

## Standards and source references

- AGENTS.md open format: https://agents.md/
- Agent Skills specification: https://agentskills.io/specification
- OpenAI Plugins: https://github.com/openai/plugins
- GitHub Awesome Copilot: https://github.com/github/awesome-copilot

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, testing expectations, security-sensitive areas, and pull request guidance.

Release history is tracked in [CHANGELOG.md](CHANGELOG.md).

## License

MIT for Vibe CLI itself. Remote catalog entries retain their upstream terms; inspect each source repository before redistribution.
