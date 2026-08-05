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
