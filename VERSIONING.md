# Versioning

## Version source of truth

Keep application version identical in:

- `src/package.json`
- `src/src-tauri/tauri.conf.json`
- `src/src-tauri/Cargo.toml`
- `src/src-tauri/Cargo.lock` package entry

Use semantic versions: `MAJOR.MINOR.PATCH`.

## Changelogs

Keep one tracked release note per version:

```text
changelog/vX.Y.Z.md
```

Use sections only when needed:

- `Added`
- `Fixed`
- `Improved`
- `Changed`
- `Security`
- `Notes`

Changelog files remain source-controlled even when GitHub releases are removed or unpublished.

## Release gate

Before publishing a tag or release:

1. Review `git diff` and `git diff --cached`.
2. Scan source, docs, artifacts, and release notes for private hostnames, LAN addresses, machine paths, credentials, and debug values.
3. Run TypeScript, Rust, and locale/config checks.
4. Confirm version files and changelog use same version.
5. Tag only the audited commit.
6. Publish release assets only after manual verification.

Never publish local machine URLs, credentials, debug endpoints, or unreviewed build artifacts.
