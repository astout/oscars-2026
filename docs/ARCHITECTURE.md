# Oscars 2026 — Architecture

## Overview

A prediction/polling app for the 98th Academy Awards (March 15, 2026). Users sign up, join or create "academies" (watch parties), make picks across all Oscar categories, place wagers on bonus events, and compete on a live leaderboard during the ceremony.

**Scale:** 20-100 users. Designed for simplicity and low cost, not enterprise scale.

---

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + Vite + TypeScript | Familiar stack, fast builds, strong ecosystem |
| Backend | Hono on AWS Lambda | Lightweight, serverless-native, modern Express alternative |
| Database | DynamoDB | Serverless, free tier, zero maintenance |
| Auth | AWS Cognito | Native email/password + Google + Apple Sign-In |
| Infra | AWS CDK (TypeScript) | IaC, same language as app code |
| Hosting | S3 + CloudFront | Static frontend, SSL, global CDN |
| API | API Gateway (HTTP API) | Lambda integration, CORS, throttling |
| DNS | Route53 | Domain management, SSL via ACM |
| PWA | vite-plugin-pwa | Offline shell, installability |

---

## AWS Account

- **Account:** 134502660579
- **Region:** us-east-1
- **CLI:** Default profile (no `--profile` needed)
- **Domain:** TBD — likely `oscars2026.alexhacks.life` (subdomain of existing domain)

---

## High-Level Architecture

```
                    Route53
                      |
                 CloudFront
                /          \
           S3 Bucket     API Gateway (HTTP API)
           (React app)        |
                         Lambda (Hono)
                        /      |      \
                  Cognito   DynamoDB   (future: SQS/SNS)
```

### Request Flow

1. User loads `oscars2026.alexhacks.life` — CloudFront serves React SPA from S3
2. React app authenticates via Cognito (hosted UI or embedded components)
3. Cognito issues JWT tokens (ID + Access)
4. API calls go to `oscars2026.alexhacks.life/api/*` — CloudFront routes to API Gateway
5. API Gateway validates JWT via Cognito authorizer
6. Lambda (Hono) processes request, reads/writes DynamoDB
7. Response flows back through the same path

### Alternative: Separate API Domain

If CloudFront path-based routing adds complexity, use `api.oscars2026.alexhacks.life` as a separate API Gateway custom domain.

---

## Project Structure

```
oscars-2026/
├── docs/
│   ├── ARCHITECTURE.md          # This file
│   ├── DATA-MODEL.md            # DynamoDB schema & access patterns
│   └── DESIGN.md                # UI/UX design system
├── infra/                       # CDK stacks (CommonJS for ts-node compat)
│   ├── bin/
│   │   └── app.ts               # CDK app entry — wires all stacks
│   ├── lib/
│   │   ├── api-stack.ts         # Lambda (NodejsFunction) + HTTP API Gateway + JWT authorizer
│   │   ├── auth-stack.ts        # Cognito user pool + web client
│   │   ├── data-stack.ts        # DynamoDB table + GSI1
│   │   └── frontend-stack.ts    # S3 + CloudFront + BucketDeployment
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
├── api/                         # Hono Lambda backend (ESM)
│   ├── src/
│   │   ├── index.ts             # Hono app + Lambda handler export
│   │   ├── local.ts             # Local dev server (@hono/node-server)
│   │   ├── seed.ts              # Seed 2026 nominees into DynamoDB
│   │   ├── routes/
│   │   │   ├── academies.ts     # CRUD academies, members, invites, lock/unlock
│   │   │   ├── picks.ts         # Make/update/view picks per academy
│   │   │   ├── categories.ts    # List categories + nominees (global)
│   │   │   ├── bonus.ts         # Bonus events + wagers
│   │   │   ├── leaderboard.ts   # Computed scores + rankings
│   │   │   └── admin.ts         # Host: set winner, lock/unlock categories
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Cognito JWT extraction from API Gateway context
│   │   │   ├── academy-access.ts # memberGuard + hostGuard
│   │   │   └── params.ts        # param() helper — safe route param extraction
│   │   ├── db/
│   │   │   ├── client.ts        # DynamoDB DocumentClient + TABLE_NAME
│   │   │   ├── academies.ts     # Academy + member CRUD
│   │   │   ├── picks.ts         # Pick read/write
│   │   │   ├── categories.ts    # Category + nominee read/write
│   │   │   ├── bonus.ts         # BonusEvent + wager CRUD
│   │   │   └── leaderboard.ts   # Score computation (read-time aggregation)
│   │   └── types/
│   │       └── index.ts         # All shared interfaces
│   ├── package.json
│   └── tsconfig.json
├── web/                         # React 19 + Vite frontend (ESM)
│   ├── src/
│   │   ├── main.tsx             # App entry + BrowserRouter
│   │   ├── App.tsx              # Route definitions
│   │   ├── pages/
│   │   │   └── Home.tsx         # Landing page (placeholder)
│   │   ├── api/
│   │   │   └── client.ts        # Fetch wrapper with Bearer token
│   │   └── styles/
│   │       └── tokens.css       # Design system CSS variables
│   ├── index.html
│   ├── vite.config.ts           # Dev proxy /api -> localhost:3001
│   ├── package.json
│   └── tsconfig.json
├── data/
│   └── 2026-nominees.json       # 24 categories, 130 nominees (98th Academy Awards)
├── CLAUDE.md                    # Project instructions for Claude
├── README.md
├── package.json                 # Monorepo root (npm workspaces)
└── tsconfig.base.json           # Shared TS config (ESM, strict)
```

---

## CDK Stack Architecture

### Stack Separation

| Stack | Resources | Dependencies |
|-------|-----------|--------------|
| `DataStack` | DynamoDB table (`oscars-2026`) + GSI1 | None |
| `AuthStack` | Cognito user pool + web app client | None |
| `ApiStack` | Lambda (NodejsFunction), HTTP API Gateway, JWT authorizer | DataStack, AuthStack |
| `FrontendStack` | S3 bucket, CloudFront distribution, BucketDeployment | None (uses `web/dist/`) |

DNS (Route53 + ACM) will be added when domain is configured.

### Deployment Order

```
DataStack + AuthStack  (parallel, no deps)
         |
      ApiStack  (needs table ARN + user pool ID)
         |
    FrontendStack  (needs web/dist/ built first)
```

---

## Authentication

### Cognito Configuration

- **User Pool:** Email as primary identifier
- **Sign-in options:** Email/password, Google, Apple
- **Password policy:** 8+ chars, no complexity requirements (it's a party app)
- **MFA:** Disabled (low-stakes, high-friction for party context)
- **Hosted UI:** Optional — can use Amplify UI components in React or build custom

### Auth Flow

1. User signs up / signs in via Cognito
2. Cognito returns ID token + access token + refresh token
3. React stores tokens (secure storage via Amplify or manual)
4. API calls include `Authorization: Bearer <id_token>`
5. API Gateway Cognito authorizer validates token
6. Lambda receives verified user claims in request context

### Social Sign-In

- **Google:** Cognito user pool identity provider (OAuth2)
- **Apple:** Cognito user pool identity provider (OIDC)
- Both require app registration with Google/Apple and configuring redirect URIs

---

## API Design

### Base URL

`/api/v1`

### Endpoints

#### Auth (handled by Cognito, not custom Lambda)
- Sign up, sign in, password reset — all via Cognito

#### Academies
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/academies` | Create academy | User |
| GET | `/academies` | List user's academies | User |
| GET | `/academies/:id` | Get academy details | Member |
| PATCH | `/academies/:id` | Update academy (name, settings) | Host |
| DELETE | `/academies/:id` | Delete academy | Host |
| POST | `/academies/:id/join` | Request to join | User |
| POST | `/academies/:id/invite` | Generate invite link | Host |
| GET | `/academies/:id/join/:code` | Join via invite code | User |
| GET | `/academies/:id/members` | List members | Member |
| PATCH | `/academies/:id/members/:userId` | Approve/remove member | Host |

#### Categories & Nominees
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/categories` | List all categories + nominees | User |
| GET | `/categories/:id` | Get category with nominees | User |

#### Picks
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/academies/:id/picks` | Get your picks | Member |
| PUT | `/academies/:id/picks/:categoryId` | Set 1st + 2nd pick | Member |
| GET | `/academies/:id/picks/all` | All members' picks (if resolved or host) | Member |

#### Bonus Events & Wagers
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/academies/:id/bonus` | List bonus events | Member |
| POST | `/academies/:id/bonus` | Create bonus event | Host |
| PATCH | `/academies/:id/bonus/:eventId` | Update/resolve bonus event | Host |
| POST | `/academies/:id/bonus/:eventId/wager` | Place wager | Member |

#### Admin / Host
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/academies/:id/lock` | Lock all categories | Host |
| POST | `/academies/:id/unlock` | Unlock all categories | Host |
| POST | `/academies/:id/categories/:catId/lock` | Lock single category | Host |
| POST | `/academies/:id/categories/:catId/winner` | Set winner | Host |

#### Leaderboard
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/academies/:id/leaderboard` | Get ranked scores | Member |

---

## Scoring System

### Category Picks
- **1st pick correct:** +5 points
- **2nd pick correct:** +3 points
- **Both wrong:** +0 points
- **1st and 2nd both pick the winner:** +5 (only highest applies)

### Bonus Events
- **Correct prediction:** +1 to +2 points (set by host per event)
- **Wager (optional):** Bet 1-5 earned points on your prediction
  - **Correct:** +2x wagered amount (net gain = wager amount)
  - **Wrong:** Lose wagered points
- **Minimum score floor:** 0 (can't go negative from wagers)

### Score Computation

Scores are computed on-read (not stored as running totals) to avoid consistency issues:

1. Query all picks for academy members
2. Query all resolved categories (with winners)
3. Query all resolved bonus events + wagers
4. Compute per-user totals
5. Sort by total descending, break ties by number of 1st-pick correct

This is fast enough at 20-100 users with 24 categories + ~10 bonus events. If needed later, add a materialized leaderboard updated on winner-set.

---

## Polling Strategy

- **Pre-ceremony:** Poll every 60s (low activity, checking if picks are locked)
- **During ceremony:** Poll every 10-15s (leaderboard updates as winners announced)
- **Stale detection:** If no change in 5 polls, back off to 30s
- **Manual refresh:** Pull-to-refresh on mobile, refresh button on desktop
- **Future upgrade path:** API Gateway WebSocket API or AWS IoT MQTT if real-time needed

---

## Offline & Resilience

- **Service worker** (via vite-plugin-pwa): Cache app shell + static assets
- **localStorage:** Cache current picks, leaderboard, categories on every successful fetch
- **Optimistic updates:** Pick selection updates UI immediately, syncs to server in background
- **Queue failed writes:** If API unreachable, queue picks in localStorage, retry on reconnect
- **Conflict resolution:** Server timestamp wins. If pick was locked server-side while user was offline, show notification on sync.

---

## Deployment

### Initial Setup

```bash
cd infra
npx cdk bootstrap aws://134502660579/us-east-1
npx cdk deploy --all
```

### Frontend Deploy

```bash
cd web
npm run build
aws s3 sync dist/ s3://<bucket-name> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

This will be automated via a deploy script or CDK custom resource.

### API Deploy

Lambda code is bundled and deployed via CDK (`NodejsFunction` construct with esbuild).

```bash
cd infra
npx cdk deploy ApiStack
```

---

## Cost Estimate (20-100 users)

| Service | Monthly Cost |
|---------|-------------|
| Lambda | ~$0 (free tier: 1M requests/mo) |
| API Gateway | ~$0 (free tier: 1M requests/mo) |
| DynamoDB | ~$0 (free tier: 25 RCU/WCU, 25GB) |
| S3 | ~$0.01 |
| CloudFront | ~$0 (free tier: 1TB/mo) |
| Cognito | ~$0 (free tier: 50K MAU) |
| Route53 | $0.50 (hosted zone) |
| ACM | $0 (free SSL certs) |
| **Total** | **~$0.50-1.00/mo** |

---

## Future Considerations (Not in Scope)

- **WebSocket/MQTT real-time:** Upgrade from polling if latency matters
- **Multi-year support:** Archive 2026 data, reuse app for 2027+
- **Public academies:** Discoverable academies anyone can join
- **Social features:** Comments, reactions, trash talk feed
- **Historical stats:** Track prediction accuracy across years
