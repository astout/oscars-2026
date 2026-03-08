# Oscars 2026

Predict the winners of the 98th Academy Awards. Create or join a watch party, make your picks across all 24 categories, place wagers on bonus events, and compete on a live leaderboard during the ceremony.

## Features

- **Oscar Picks** — 1st pick (5 pts) and 2nd pick (3 pts) for each category
- **Bonus Events** — Custom yes/no or multiple-choice predictions with optional point wagers
- **Watch Parties** — Create your own party, invite friends, manage members
- **Live Leaderboard** — Rankings update as winners are announced
- **Host Controls** — Lock/unlock picks, manage members, rename party
- **Emcee System** — Ceremony admins set winners globally across all parties of an event type
- **Ceremony Mode** — Emcee-only view for announcing winners live during the show
- **Multi-Auth** — Email/password, Google, or Apple Sign-In

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript |
| Backend | Hono on AWS Lambda |
| Database | DynamoDB |
| Auth | AWS Cognito |
| Infra | AWS CDK (TypeScript) |
| Hosting | S3 + CloudFront |

## Development

```bash
# Install dependencies
npm install

# Start API locally
cd api && npm run dev

# Start frontend locally
cd web && npm run dev

# Deploy infrastructure
cd infra && npx cdk deploy --all

# Seed nominee data
cd api && npx tsx src/seed.ts
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA-MODEL.md)
- [Design System](docs/DESIGN.md)
