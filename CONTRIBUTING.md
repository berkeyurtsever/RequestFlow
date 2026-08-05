# Contributing to RequestFlow

## Development Workflow

1. Update your local `main` branch.
2. Create a focused branch:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c feature/short-description
   ```

3. Make one logical change at a time.
4. Run the backend and frontend quality checks described in `README.md`.
5. Commit with a short, descriptive message.
6. Push the branch and open a pull request into `main`.

Recommended branch prefixes:

- `feature/` for new functionality
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for internal restructuring

## Pull Requests

- Explain what changed and why.
- Keep unrelated changes out of the pull request.
- Add screenshots for visual changes.
- Never include secrets, `.env` files, databases, uploads, or generated build folders.
- Wait for the GitHub Actions checks to pass before merging.

## Commit Messages

Use a concise imperative description, for example:

```text
Add request status filter
Fix mobile sidebar overflow
Document local setup
```

## Reporting Problems

Use the repository's Bug Report issue template. Include reproduction steps, expected behavior, actual behavior, and environment details without sharing credentials or sensitive logs.
