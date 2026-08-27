# Vibe CLI Design

## Product goal

Help developers begin agent-assisted software projects with explicit contracts and safe delivery gates rather than an empty repository and unconstrained prompts.

## Primary user

A developer or technical lead who wants an agent-ready project structure, reusable software-development Skills, and a predictable flow from product intent to deployment.

## Core experience

1. Run `vibe init` for the technology-neutral core, optionally with a preset, extensible stack list, or source prompt.
2. Receive a readable repository structure with only `.agents/` and `.vibe/` as root directories and without network side effects.
3. Run `vibe next` to obtain the current artifact, recommended Skill, blockers, agent prompt, and approval action.
4. Complete the requirements artifact and use `doctor` for feedback.
5. Approve each stage with an accountable identity and evidence hashes.
6. Use project-local Skills to perform only the current stage.
7. Optionally install a reviewed remote Skill through a fail-closed verification pipeline.

## Design principles

- Safe by default: no framework install, remote download, script execution, or production action during initialization.
- Transparent: generated Markdown remains directly editable and understandable.
- Portable: use AGENTS.md and SKILL.md conventions rather than a private prompt database.
- Traceable: preserve ordered approvals and content hashes.
- Team-safe: approved contracts remain verifiable across branches, developers, and assistants; detected drift never becomes an automatic human decision.
- Composable: add only stack-relevant Skills while keeping an end-to-end orchestrator.
- Progressive specialization: custom stacks remain valid metadata while known stacks add focused Skills without pre-creating implementation directories.
- Fail closed: checksum, path, host, size, or audit failures stop remote installation.

## Information architecture

- `init`: project creation.
- `next`: current-stage guidance from scaffold through accountable approval.
- `doctor`: repository diagnostics.
- `workflow`: status, integrity verification, approval, history, and explicit reopening.
- `artifacts`: schema-aware resolution of logical workflow documents, stored at the root for schema v1 and under the configured `.vibe/artifacts/` directory for schema v2.
- `migration`: explicit, non-destructive schema v1 to v2 relocation with approval-evidence path transformation and checksum preservation.
- `skills`: bundled discovery, local audit, catalog inspection, and secure installation.

## Important states

- Empty target versus non-empty target.
- Dry-run versus write.
- Pending, approved, and invalidated workflow stages.
- Incomplete and complete workflow progress, reported separately from ledger integrity.
- Verified, drifted, and invalid approval integrity derived from current artifacts.
- Clean Skill, warning-only Skill, and rejected Skill.
- Downloaded, checksum-mismatched, audit-failed, and atomically installed remote content.

## Accessibility and output

Output is plain text with no color dependency. Tables use headers and aligned columns but all information remains readable linearly. Every command supports predictable error messages; key inspection commands support JSON.

## Non-goals for 0.1

- Executing framework generators.
- Selecting cloud vendors automatically.
- Managing secret values.
- Deploying production.
- Claiming that static Skill audit is a formal sandbox or malware proof.
- Hosting a public mutable marketplace.
