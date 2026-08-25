## Summary

Describe what this pull request changes and why.

## Validation

- [ ] `npm ci`
- [ ] `npm run check`
- [ ] Relevant tests were added or updated when behavior changed
- [ ] Documentation was updated when user-facing behavior changed

## Security-sensitive changes

If this PR changes remote Skill installation, URL handling, filesystem paths, hashing, audit patterns, workflow approvals, or registry metadata, describe the security impact and review performed.

## Checklist

- [ ] The change keeps runtime dependencies at zero unless explicitly justified
- [ ] `vibe init` does not automatically execute remote scripts
- [ ] No credentials, tokens, or private data are included
- [ ] The PR is focused and does not contain unrelated changes
