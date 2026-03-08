# Oscars 2026

Oscar prediction/polling app for the 98th Academy Awards (March 15, 2026).

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
- Hono routes grouped by domain (parties, picks, bonus, admin, leaderboard)
- DynamoDB single-table design — composite PK/SK keys, one GSI
- Scores computed on read, not stored as running totals
- `param()` helper for route params (avoids `string | undefined` noise)
- ULIDs for all generated IDs

## Key Concepts

- **Event**: A ceremony type (e.g. `oscars_2026`). Has a `templatePartyId` pointing to the seed/template party. Categories and nominees belong to events (`EVENT#oscars_2026`).
- **Party**: A watch party linked to an event via `eventId`. DynamoDB keys: `PARTY#<partyId>`. Each party has a host who manages members and bonuses.
- **Emcee**: Ceremony admin for an event. Can set winners, lock/unlock categories. Stored as `EVENT#<eventId>/EMCEE#<userId>`. Separate from per-party host role.
- **Picks**: Each user picks 1st (5 pts) and 2nd (3 pts) per category per party.
- **Bonus Events**: Per-party wager-based predictions. Host-managed.

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
| Party access | `api/src/middleware/party-access.ts` | memberGuard, hostGuard middleware |
| Emcee access | `api/src/middleware/emcee-access.ts` | emceeGuard for ceremony operations |
| Events DB | `api/src/db/events.ts` | Event and emcee CRUD |
| Parties DB | `api/src/db/parties.ts` | Party and member CRUD |
| Scoring | `api/src/db/leaderboard.ts` | Score computation algorithm |
| Design tokens | `web/src/styles/tokens.css` | CSS variables from DESIGN.md |
| API client | `web/src/api/client.ts` | Fetch wrapper with auth headers |
| Seed data | `data/2026-nominees.json` | 24 categories, 130 nominees |
| CDK entry | `infra/bin/app.ts` | Stack wiring and dependencies |
