# Deployment Guide

RequestFlow is prepared for container-based deployment. The API, frontend, SQLite database, and uploaded files must remain together on one persistent host.

## Required production values

- A long random `JWT_KEY`
- A public HTTPS domain
- Persistent storage for `/data` and `/app/Uploads`
- A backup plan for the SQLite database and uploads

## Local production check

```bash
cp .env.docker.example .env.docker
# Replace the example JWT key before continuing.
docker compose --env-file .env.docker up --build
```

Open <http://localhost:5173>. The API health check is available at <http://localhost:5173/health>.

## Hosting requirements

Choose a provider that supports Docker Compose or two containers on the same private network, HTTPS, and persistent volumes. Configure the frontend as the public service and keep the API reachable through the frontend proxy. Do not deploy with an ephemeral SQLite filesystem.

Before making a public demo, use demo-only accounts and data. Never upload internship records, personal data, or real company documents.

## Render public demo

The repository includes a `render.yaml` Blueprint and a dedicated `Dockerfile.render` for a free, single-service portfolio demo. The React build is served by ASP.NET Core from the same origin, so the demo does not expose a separate API service.

The Render demo intentionally uses an ephemeral SQLite database. Free Render services lose local filesystem changes when they restart or spin down, so the demo recreates safe sample users and requests on the next start. This mode is not suitable for production data.

When `Demo__Enabled=true`:

- a one-click Supervisor demo session is available;
- account registration is disabled;
- password changes are disabled;
- file uploads are disabled;
- request rate limits are enforced;
- only generated sample names, emails and requests are seeded.

Render generates the JWT signing key from `render.yaml`. Never replace it with an example value or reuse it outside that service.
