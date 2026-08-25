# Security Policy

## Threat model

Vibe handles project paths and optional remote instruction files. The main threats are path traversal, symlink escape, oversized or binary payloads, executable content, mutable upstream content, checksum substitution, prompt injection, credential-access instructions, destructive shell guidance, partial installation, and silent workflow approval bypass.

## Controls

- HTTPS and explicit remote host allowlist.
- Redirect destination revalidation.
- Relative-path containment with normalized, resolved paths.
- File and total-size limits.
- SHA-256 verification before installation.
- Text-only extension policy, binary detection, and no executable bits.
- Static high-risk instruction scanning.
- Skill frontmatter and directory-name validation.
- Temporary staging and same-filesystem atomic rename.
- Lockfile and provenance records.
- Ordered workflow prerequisites and artifact hash evidence.
- No runtime npm dependencies and no install-time lifecycle scripts.

## Reporting

Report vulnerabilities privately to the repository owner. Do not include real credentials, tokens, or production data in reports or fixtures.
