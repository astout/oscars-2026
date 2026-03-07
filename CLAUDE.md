# Oscars 2026

Oscar prediction/polling app for the 98th Academy Awards (March 15, 2026).

## Docs (read before making changes)

- `docs/ARCHITECTURE.md` — Stack, infra, API design, project structure
- `docs/DATA-MODEL.md` — DynamoDB schema, access patterns, scoring
- `docs/DESIGN.md` — UI/UX design system, components, colors, typography

## Stack

- **Frontend:** React 19 + Vite + TypeScript (`web/`)
- **Backend:** Hono on Lambda (`api/`)
- **Database:** DynamoDB single-table (`oscars-2026`)
- **Auth:** Cognito (email/password, Google, Apple Sign-In)
- **Infra:** CDK TypeScript (`infra/`)
- **Hosting:** S3 + CloudFront, HTTP API Gateway

## Conventions

- TypeScript strict mode everywhere
- Monorepo with npm workspaces (`api`, `web`, `infra`)
- CSS variables for design tokens (`web/src/styles/tokens.css`)
- Dark mode only — no light theme
- Mobile-first responsive design
- Hono routes grouped by domain (academies, picks, bonus, admin, leaderboard)
- DynamoDB single-table design — composite PK/SK keys, one GSI
- Scores computed on read, not stored as running totals
- `param()` helper for route params (avoids `string | undefined` noise)
- ULIDs for all generated IDs

## AWS

- Account: 134502660579, us-east-1
- Default CLI profile (no `--profile`)
- CDK stacks: DataStack, AuthStack, ApiStack, FrontendStack

## Commands

```bash
# Install
npm install

# Infra
cd infra && npx cdk deploy --all

# API (local dev)
cd api && npm run dev

# Frontend (local dev)
cd web && npm run dev

# Typecheck
cd api && npx tsc --noEmit
cd web && npx tsc --noEmit

# Seed nominee data
cd api && npx tsx src/seed.ts
```

## Key Files

| Area | File | Purpose |
|------|------|---------|
| API entry | `api/src/index.ts` | Hono app, route mounting, Lambda handler |
| Types | `api/src/types/index.ts` | All shared TypeScript interfaces |
| Auth | `api/src/middleware/auth.ts` | Cognito JWT extraction |
| Scoring | `api/src/db/leaderboard.ts` | Score computation algorithm |
| Design tokens | `web/src/styles/tokens.css` | CSS variables from DESIGN.md |
| API client | `web/src/api/client.ts` | Fetch wrapper with auth headers |
| Seed data | `data/2026-nominees.json` | 24 categories, 130 nominees |
| CDK entry | `infra/bin/app.ts` | Stack wiring and dependencies |
