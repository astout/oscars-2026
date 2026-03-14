# E2E Test Plan — Oscars 2026

## Test Users

| Alias     | Email                       | Role in Test                        |
|-----------|-----------------------------|-------------------------------------|
| `host`    | astoutj@gmail.com           | Party host + emcee                  |
| `memberA` | (created during test setup) | Active member of host's party       |
| `memberB` | (created during test setup) | Active member, joins second party   |
| `viewer`  | (unauthenticated)           | Public leaderboard viewer           |

## Fixtures

- **hostParty**: "Oscars 2026" party (existing, hosted by `host`)
- **openParty**: "Oscars 2026" open/public party (existing, `isPublic: true`)

---

## 1. Auth Flow (`auth.spec.ts`)

### 1a. Fresh sign-in
- Navigate to `/auth`
- Fill email + password, click Sign In
- **Check**: URL changes to `/`, "Watch Parties" heading visible
- **Check**: Profile button visible in top bar

### 1b. Sign-out and re-sign-in
- Navigate to Profile, click Sign Out
- **Check**: Redirected to `/auth`
- Sign in again
- **Check**: Home page loads (no blank page)

### 1c. Protected route redirect
- As unauthenticated, navigate to `/party/some-id/categories`
- **Check**: Redirected to `/auth`
- Sign in
- **Check**: Redirected back to the original deep link (pendingRedirect)

---

## 2. Home Page — Watch Parties (`home.spec.ts`)

### 2a. Host view
- Sign in as `host`
- **Check**: "Watch Parties" heading + party count
- **Check**: "Public Leaderboard" card visible
- **Check**: Open party card visible with member count
- **Check**: Private parties listed with "Host" badge and crown icon
- **Check**: Create + Join buttons visible

### 2b. Member view
- Sign in as `memberA`
- **Check**: Parties listed with "Member" role (no crown)
- **Check**: Open party card shows "Joined" if already member

---

## 3. Party Management (`party-management.spec.ts`)

### 3a. Create party
- As `host`, click Create → enter party name → submit
- **Check**: Navigated to new party's categories page
- **Check**: Party appears on home page on return

### 3b. Invite + join flow
- As `host`, go to party Settings → copy invite link
- In a separate context, sign in as `memberA`
- Navigate to the invite link
- **Check**: memberA auto-joins or goes to pending (depending on party type)
- **Check**: Host sees pending member in Settings (if applicable)
- Host approves member
- **Check**: memberA now sees party in their party list

### 3c. Join public party
- As `memberB`, navigate to home
- Click "Join" on open party card
- **Check**: Navigated to party page (auto-approved, no host action needed)

### 3d. Leave party
- As `memberA`, go to Settings → Leave Party → confirm
- **Check**: Redirected to home, party removed from list

### 3e. Delete party (host only)
- As `host`, create a throwaway party
- Go to Settings → Delete Party → confirm
- **Check**: Redirected to home, party gone

---

## 4. Categories & Picks (`picks.spec.ts`)

### 4a. Browse categories
- As `memberA`, navigate to party → Categories
- **Check**: 24 category cards visible
- **Check**: Each shows category name and nominee count
- **Check**: "0 of 24 picked" progress indicator

### 4b. Make picks
- Click a category card → pick modal opens
- **Check**: All nominees listed with images (where applicable)
- Select 1st place nominee
- **Check**: 1st place highlight shown
- Select 2nd place nominee (different from 1st)
- **Check**: Both picks shown, save button enabled
- Save picks
- **Check**: Category card updates to show picked state
- **Check**: Progress updates ("1 of 24 picked")

### 4c. Cannot pick same nominee for 1st and 2nd
- Open a category, select a nominee as 1st
- Try to select the same nominee as 2nd
- **Check**: Selection rejected or not allowed

### 4d. Locked category
- Emcee locks a category
- **Check**: Category shows locked indicator
- **Check**: Tapping locked category does not allow changes

### 4e. Copy picks between parties
- `memberA` is in two parties, has picks in one
- Go to second party → Settings → Copy Picks
- Select source party, confirm
- **Check**: Success message with copied/skipped counts
- Navigate to Categories
- **Check**: Picks from source party now applied (except locked categories)

---

## 5. Leaderboard (`leaderboard.spec.ts`)

### 5a. Party leaderboard
- As `memberA`, navigate to party → Leaderboard
- **Check**: All active members listed
- **Check**: Each row shows display name, total points, category/bonus breakdown
- **Check**: Rank numbers displayed, ties share rank
- **Check**: Refresh button works

### 5b. Score accuracy
- Emcee sets a winner for a category
- Refresh leaderboard
- **Check**: Members who picked that winner gain points
  - 1st pick correct: +5 pts
  - 2nd pick correct: +3 pts
- **Data check**: Compare displayed scores against DB computation

### 5c. Public leaderboard
- Navigate to `/leaderboard` (no auth)
- **Check**: Page loads without sign-in
- **Check**: Shows participant count + party count header
- **Check**: Entries show display name + party name
- **Check**: Opted-out members NOT visible
- **Check**: Parties with `publicParticipation: false` NOT visible

### 5d. Public leaderboard updates after winner set
- Open `/leaderboard` in viewer context (no auth)
- In emcee context, set a winner
- Refresh public leaderboard
- **Check**: Scores updated to reflect new winner

---

## 6. Bonus Events / Wagers (`bonus.spec.ts`)

### 6a. Host creates wager
- As `host`, navigate to party → Settings → Manage Wagers
- Click "Add" → fill question, add options, set max wager
- **Check**: Wager appears in list with "open" status

### 6b. Member places wager
- As `memberA`, navigate to party → Bonus
- **Check**: Wager question visible with options
- Select prediction, set wager amount (1 to maxWager)
- Submit
- **Check**: Prediction + amount shown on card

### 6c. Host locks wager
- As `host`, lock the wager
- **Check**: memberA sees locked status, cannot change prediction

### 6d. Host resolves wager
- As `host`, resolve wager → select correct answer
- **Check**: Status changes to "resolved"
- **Check**: Leaderboard reflects bonus point changes
  - Correct prediction: +wagerAmount
  - Wrong prediction: −wagerAmount

### 6e. Template suggestions
- As `host`, open manage wagers
- **Check**: Suggestions section shows template wagers (if any)
- Add a suggestion
- **Check**: It becomes a new wager

---

## 7. Ceremony Mode (`ceremony.spec.ts`)

### 7a. Emcee sets winner
- As `host` (who is also emcee), go to Ceremony Mode
- Expand a category
- Click a nominee to set as winner
- **Check**: Nominee highlighted in gold
- **Check**: Progress counter increments ("1 of 24 announced")

### 7b. Up Next
- Mark a category as "Up Next"
- **Check**: Category shows up-next indicator
- In member context, check Categories page
- **Check**: Up-next category highlighted or badged

### 7c. Lock all / unlock all
- Toggle "Lock All" in ceremony mode
- **Check**: All categories show locked state
- In member context, verify no picks can be changed
- Unlock all
- **Check**: Picks editable again (except individually locked)

### 7d. Emcee management
- Navigate to Emcee settings
- Add an emcee by email
- **Check**: New emcee appears in list
- Remove the emcee
- **Check**: Emcee removed from list

---

## 8. Multi-User Interactions (`multi-user.spec.ts`)

### 8a. Simultaneous contexts
- Open 3 browser contexts: host, memberA, viewer (unauth)
- Host sets a winner in ceremony mode
- memberA refreshes leaderboard
- **Check**: Score updated for memberA
- Viewer refreshes public leaderboard
- **Check**: Score updated on public leaderboard

### 8b. Host approves member, member sees party
- memberB requests to join host's party via invite code
- Host approves memberB
- memberB refreshes home page
- **Check**: Party now visible in memberB's party list

### 8c. Pick visibility
- memberA makes picks in a category
- Host views leaderboard
- **Check**: memberA's score reflects the pick (if winner was already set)

---

## 9. Public / Open Party (`public-party.spec.ts`)

### 9a. Public party listing
- Unauthenticated GET `/api/public/v1/parties/public`
- **Check**: Response includes open party with member count

### 9b. Join open party
- As `memberB`, navigate home
- Click join on open party
- **Check**: Auto-joined (no pending state)
- **Check**: Party page accessible immediately

### 9c. Public leaderboard opt-out
- As `memberA` in a party, go to Settings
- Toggle public opt-out ON
- Refresh `/leaderboard`
- **Check**: memberA no longer appears in public leaderboard
- Toggle opt-out OFF
- **Check**: memberA reappears

---

## 10. Edge Cases & Error States (`edge-cases.spec.ts`)

### 10a. Invalid invite code
- Navigate to `/join?code=INVALID`
- **Check**: Error message displayed

### 10b. Access party not a member of
- Navigate directly to `/party/<random-id>/categories`
- **Check**: Error or redirect (not blank page)

### 10c. Duplicate pick prevention
- Try to pick the same nominee as both 1st and 2nd
- **Check**: API rejects with error

### 10d. Wager bounds
- Try to place wager exceeding maxWager
- **Check**: Rejected

---

## Visual Checks (Screenshots)

Each test should capture screenshots at key states:
1. Home page — host vs member view
2. Categories grid — empty, partially picked, fully picked
3. Pick modal — nominee selection states
4. Leaderboard — with scores, with ties
5. Bonus events — open, locked, resolved states
6. Ceremony mode — in progress, category expanded
7. Public leaderboard — populated view
8. Settings page — host view vs member view
9. Auth page — sign-in form

Screenshots saved to `e2e/screenshots/` with descriptive names.

---

## Data Verification Strategy

For critical score checks, tests should:
1. Use the API directly (fetch with auth token) to verify DB state
2. Compare displayed values against API response
3. Key checks:
   - Leaderboard totals = sum of category + bonus points
   - Rank ordering correct (ties share rank)
   - Public leaderboard filters opted-out members
   - Winner setting correctly awards 5pts (1st) / 3pts (2nd)
