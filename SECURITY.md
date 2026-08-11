# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting from the repository's **Security** tab and include the affected area, reproduction steps, and possible impact.

## Secrets and local data

- Keep JWT keys, `.env` files, databases, uploaded files, and real credentials out of Git.
- Production refuses to start with short or recognizable placeholder JWT keys.
- Treat every example or historical development key as compromised and never reuse it.
- Use a unique, randomly generated `Jwt__Key` for every deployed environment.

## Dependency review

Backend packages are checked with `dotnet list package --vulnerable`. Frontend production packages are checked with `npm run audit:production`. The audit fails when any vulnerability outside the documented React Router advisory appears.

The current React Router advisory `GHSA-qwww-vcr4-c8h2` affects React Server Components action handling. RequestFlow is a client-side `BrowserRouter` application and does not enable React Server Components. The repository uses the latest available stable `react-router-dom` release; this note should be removed once a stable patched release is available and installed.
