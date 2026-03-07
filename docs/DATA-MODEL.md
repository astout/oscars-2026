# Oscars 2026 — DynamoDB Data Model

## Design Approach

Single-table design with composite keys. All entities share one table to minimize Lambda cold-start connections and simplify CDK setup. A GSI enables reverse lookups (e.g., find all academies for a user).

---

## Table: `oscars-2026`

**Primary Key:** `PK` (String) + `SK` (String)
**GSI1:** `GSI1PK` (String) + `GSI1SK` (String)

---

## Entities

### User

Stored on Cognito. DynamoDB holds app-specific profile data.

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `USER#<userId>` | `USER#abc123` |
| SK | `METADATA` | `METADATA` |
| userId | | `abc123` |
| displayName | | `Alex S.` |
| email | | `alex@example.com` |
| avatarUrl | | (optional) |
| createdAt | | `2026-02-15T10:00:00Z` |

**GSI1:** Not indexed (no reverse lookup needed).

---

### Academy

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `ACADEMY#<academyId>` | `ACADEMY#a1b2c3` |
| SK | `METADATA` | `METADATA` |
| academyId | | `a1b2c3` |
| name | | `Alex's Oscar Party 2026` |
| hostUserId | | `abc123` |
| inviteCode | | `x7k9m2` |
| allLocked | | `false` |
| createdAt | | `2026-02-15T10:00:00Z` |

**GSI1PK:** `HOST#<hostUserId>` — find academies a user hosts.

---

### AcademyMember

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `ACADEMY#<academyId>` | `ACADEMY#a1b2c3` |
| SK | `MEMBER#<userId>` | `MEMBER#abc123` |
| userId | | `abc123` |
| displayName | | `Alex S.` |
| role | | `host` or `member` |
| status | | `active` or `pending` |
| joinedAt | | `2026-02-15T10:00:00Z` |

**GSI1PK:** `USER#<userId>` — find all academies a user belongs to.
**GSI1SK:** `ACADEMY#<academyId>`

**Access patterns:**
- List members of academy: `PK = ACADEMY#<id>`, `SK begins_with MEMBER#`
- List academies for user: `GSI1PK = USER#<userId>`, `GSI1SK begins_with ACADEMY#`
- Check membership: `PK = ACADEMY#<id>`, `SK = MEMBER#<userId>`

---

### Category

Global categories (not per-academy). Shared across all academies.

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `YEAR#2026` | `YEAR#2026` |
| SK | `CATEGORY#<categoryId>` | `CATEGORY#best-picture` |
| categoryId | | `best-picture` |
| name | | `Best Picture` |
| displayOrder | | `1` |
| winnerId | | `sinners` or `null` |
| locked | | `false` |
| resolvedAt | | `null` or `2026-03-15T23:15:00Z` |

**Access patterns:**
- List all categories: `PK = YEAR#2026`, `SK begins_with CATEGORY#`
- Get single category: `PK = YEAR#2026`, `SK = CATEGORY#<id>`

---

### Nominee

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `CATEGORY#<categoryId>` | `CATEGORY#best-picture` |
| SK | `NOMINEE#<nomineeId>` | `NOMINEE#sinners` |
| nomineeId | | `sinners` |
| name | | `Sinners` |
| subtitle | | (optional) e.g., director name, actor name |
| imageUrl | | (optional) poster/headshot |
| displayOrder | | `1` |

**Access patterns:**
- List nominees for category: `PK = CATEGORY#<id>`, `SK begins_with NOMINEE#`

---

### Pick

Per-academy, per-user, per-category.

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `ACADEMY#<academyId>` | `ACADEMY#a1b2c3` |
| SK | `PICK#<userId>#<categoryId>` | `PICK#abc123#best-picture` |
| userId | | `abc123` |
| categoryId | | `best-picture` |
| pick1NomineeId | | `sinners` |
| pick2NomineeId | | `hamnet` |
| updatedAt | | `2026-02-28T15:30:00Z` |

**GSI1PK:** `USER#<userId>` — find all picks by a user across academies.
**GSI1SK:** `PICK#<academyId>#<categoryId>`

**Access patterns:**
- Get user's picks in academy: `PK = ACADEMY#<id>`, `SK begins_with PICK#<userId>#`
- Get all picks for a category in academy: `PK = ACADEMY#<id>`, `SK begins_with PICK#` + filter on categoryId
- Get all picks by user (cross-academy): `GSI1PK = USER#<userId>`, `GSI1SK begins_with PICK#`

---

### BonusEvent

Per-academy. Created by host.

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `ACADEMY#<academyId>` | `ACADEMY#a1b2c3` |
| SK | `BONUS#<eventId>` | `BONUS#evt-cry-speech` |
| eventId | | `evt-cry-speech` |
| question | | `Will someone cry during their acceptance speech?` |
| eventType | | `yes-no` or `multiple-choice` |
| options | | `["Yes", "No"]` or `["Option A", "Option B", "Option C"]` |
| correctAnswer | | `null` (unresolved) or `"Yes"` |
| basePoints | | `2` |
| status | | `open`, `locked`, or `resolved` |
| createdAt | | `2026-03-15T20:00:00Z` |
| resolvedAt | | `null` or `2026-03-15T23:30:00Z` |

**Access patterns:**
- List bonus events for academy: `PK = ACADEMY#<id>`, `SK begins_with BONUS#`

---

### Wager

Per-academy, per-user, per-bonus-event.

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `ACADEMY#<academyId>` | `ACADEMY#a1b2c3` |
| SK | `WAGER#<userId>#<eventId>` | `WAGER#abc123#evt-cry-speech` |
| userId | | `abc123` |
| eventId | | `evt-cry-speech` |
| prediction | | `"Yes"` |
| wagerAmount | | `3` (0 = no wager, just prediction) |
| createdAt | | `2026-03-15T20:15:00Z` |

**Access patterns:**
- Get user's wagers in academy: `PK = ACADEMY#<id>`, `SK begins_with WAGER#<userId>#`
- Get all wagers for a bonus event: `PK = ACADEMY#<id>`, `SK begins_with WAGER#` + filter on eventId

---

### Invitation (optional — invite codes are on Academy)

For tracking pending email invitations if we want explicit invite tracking:

| Attribute | Key | Example |
|-----------|-----|---------|
| PK | `ACADEMY#<academyId>` | `ACADEMY#a1b2c3` |
| SK | `INVITE#<email>` | `INVITE#friend@example.com` |
| email | | `friend@example.com` |
| invitedBy | | `abc123` |
| status | | `pending` or `accepted` |
| createdAt | | `2026-02-20T10:00:00Z` |

**Access patterns:**
- List invitations for academy: `PK = ACADEMY#<id>`, `SK begins_with INVITE#`

---

## GSI1 Summary

| Entity | GSI1PK | GSI1SK | Purpose |
|--------|--------|--------|---------|
| AcademyMember | `USER#<userId>` | `ACADEMY#<academyId>` | User's academies |
| Pick | `USER#<userId>` | `PICK#<academyId>#<categoryId>` | User's picks |
| Academy | `HOST#<hostUserId>` | `ACADEMY#<academyId>` | Hosted academies |

---

## Score Computation (Read-Time)

No stored score totals. Computed per-request for the leaderboard:

```
For each member in academy:
  categoryScore = 0
  For each resolved category:
    pick = getPick(academyId, userId, categoryId)
    if pick.pick1NomineeId == category.winnerId:
      categoryScore += 5
    elif pick.pick2NomineeId == category.winnerId:
      categoryScore += 3

  bonusScore = 0
  For each resolved bonus event:
    wager = getWager(academyId, userId, eventId)
    if wager.prediction == event.correctAnswer:
      bonusScore += event.basePoints
      bonusScore += wager.wagerAmount  (the 2x return, net gain = wager)
    else:
      bonusScore -= wager.wagerAmount

  totalScore = max(0, categoryScore + bonusScore)
```

At 100 users x 24 categories x 10 bonus events, this is ~3400 item reads — well within a single Lambda invocation. DynamoDB `BatchGetItem` or `Query` makes this fast.

---

## Capacity Planning

**DynamoDB on-demand mode** (pay-per-request). At this scale, costs are negligible.

Estimated items:
- Users: ~100
- Academies: ~10-20
- Members: ~200 (users x academies)
- Categories: 24
- Nominees: ~120 (avg 5 per category)
- Picks: ~2,400 (100 users x 24 categories, per academy)
- Bonus events: ~50 (across all academies)
- Wagers: ~500

**Total items:** ~3,500
**Total storage:** < 1MB

---

## Conditional Writes (Data Integrity)

### Pick submission
- **Condition:** Category must not be locked AND academy `allLocked` must be false
- Use `ConditionExpression` or check in Lambda before write

### Wager placement
- **Condition:** Bonus event status must be `open`
- **Condition:** `wagerAmount` must be <= user's current score (computed at write time)

### Winner setting
- **Condition:** Caller must be academy host (checked via membership record)
- **Condition:** `winnerId` must be a valid nominee for that category

### Join request
- **Condition:** User must not already be a member (prevent duplicate)

---

## Data Seeding

Categories and nominees are seeded via a script that writes to DynamoDB:

```bash
cd api
npx tsx src/seed.ts  # Reads data/2026-nominees.json, writes to DynamoDB
```

The seed script is idempotent — uses `PutItem` with full key, safe to re-run.
