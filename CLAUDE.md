# Oscars 2026

Oscar prediction/polling app for the 98th Academy Awards (March 2, 2026).

## Docs

Read these before making changes:
- `docs/ARCHITECTURE.md` — Stack, infrastructure, API design, project structure
- `docs/DATA-MODEL.md` — DynamoDB schema, access patterns, scoring logic
- `docs/DESIGN.md` — UI/UX design system, components, colors, typography

## Stack

- **Frontend:** React + Vite + TypeScript (`web/`)
- **Backend:** Hono on Lambda (`api/`)
- **Database:** DynamoDB (single-table)
- **Auth:** Cognito (email/password, Google, Apple)
- **Infra:** CDK TypeScript (`infra/`)
- **Hosting:** S3 + CloudFront, API Gateway

## Conventions

- TypeScript everywhere (strict mode)
- Monorepo with npm workspaces
- CSS variables for design tokens (see `docs/DESIGN.md`)
- Dark mode only — no light theme
- Mobile-first responsive design
- Hono routes grouped by domain (academies, picks, bonus, admin, leaderboard)
- DynamoDB single-table design — all entities in one table
- Scores computed on read, not stored

## AWS

- Account: 134502660579, us-east-1
- Default CLI profile (no `--profile`)
- CDK bootstrap already done (or will be on first deploy)

## Commands

```bash
# Infra
cd infra && npx cdk deploy --all

# API (local dev)
cd api && npm run dev

# Frontend (local dev)
cd web && npm run dev

# Seed data
cd api && npx tsx src/seed.ts
```
