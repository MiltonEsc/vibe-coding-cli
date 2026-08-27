# Vibe Team Workflow

Vibe coordinates teams that pair each developer with an AI assistant without turning the CLI into a project-management server. The operating model is **Contract-First + Branch-by-Task + PR-Gated + Explicit Reopen**.

## Shared contracts

Approved artifacts are the team's shared truth:

| Artifact | Contract |
| --- | --- |
| `.vibe/artifacts/requirements.md` | Product scope and acceptance |
| `.vibe/artifacts/architecture.md` | System boundaries and decisions |
| `.vibe/artifacts/database.md` | Data ownership, schema, and migration rules |
| `.vibe/artifacts/design.md` | User experience and accessibility |
| Other files in `.vibe/artifacts/` | Stage-specific implementation and evidence |

Before implementation, every developer or assistant runs:

```bash
vibe next
vibe workflow status
vibe workflow verify
```

`vibe next` identifies the current contract, recommended Skill, unresolved markers, and accountable review action. The authoring assistant does not approve its own work; use a different human reviewer, or CI only when the team has explicitly configured CI as the approval gate.

An approved stage with changed evidence reports `drifted`. Vibe does not silently convert it to pending because reopening is a human governance decision.

## Branch by task

Use one focused objective per branch, for example:

```text
feat/auth-password-reset
feat/user-profile
fix/payment-timeout
contract/auth-boundary-change
```

Before editing, state:

- task ID and objective;
- owner and current branch;
- allowed files or areas;
- approved contracts being consumed;
- protected contracts that must not change;
- whether a contract change may be required.

Avoid combining an implementation task with unrelated architecture, schema, framework, dependency, or repository-wide refactors.

## Contract changes

An assistant must never modify an approved upstream contract as a side effect. It should stop and report:

```text
Contract change required.

Affected contract: .vibe/artifacts/architecture.md
Reason: the requested implementation changes an authentication boundary.
Current stage: backend
Affected downstream stages: database, backend, frontend, testing, review, deployment
Required action: explicit human authorization to reopen architecture.
```

An accountable human can then run:

```bash
vibe workflow reopen architecture \
  --reason "Authentication boundary changed" \
  --actor "alice@example.com"
```

Reopen invalidates downstream approvals and records the actor, reason, Git context, drift state, and invalidated stages in `.vibe/workflow-history.jsonl`.

## Pull-request gate

Recommended protection for `main`:

| Setting | Recommendation |
| --- | --- |
| Direct pushes | Disabled |
| Pull request | Required |
| Required approvals | At least 1 |
| Required status checks | Enabled |
| Dismiss stale approvals | Recommended |
| CODEOWNER review | Recommended |
| Resolved conversations | Required |

Vibe does not configure repository settings automatically. Git and the hosting platform own collaboration and merge; Vibe owns local contract verification.

## CODEOWNERS starting point

Do not invent owners. Copy only the applicable lines and replace placeholders with real teams:

```text
.vibe/artifacts/requirements.md  @product-team
.vibe/artifacts/architecture.md  @architecture-team
.vibe/artifacts/database.md      @backend-team
.vibe/artifacts/design.md        @design-team
.vibe/artifacts/deployment.md    @platform-team
```

Unconfigured CODEOWNERS is not a `vibe doctor` error.

## CI

Use the example in [`docs/examples/vibe-governance.yml`](examples/vibe-governance.yml) as a starting point. A merge gate should fail on approval drift, corrupt workflow state, unsafe Skills, or project test failures.

## Task manifests roadmap

A future release may add small `.vibe/tasks/<task-id>.json` manifests and `vibe task` commands for declaring owner, branch, stage, allowed scope, and protected contracts. Git remains the source of concurrency; Vibe will not implement distributed locks or replace an issue tracker.
