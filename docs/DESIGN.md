# Oscars 2026 — Design System & UI/UX Specification

## Design Direction

**Personality:** Boldness & Sophistication — Black tie cinema meets modern web. This is an awards show companion app used during one high-stakes night per year. It must feel premium, theatrical, and effortlessly smooth. Zero tolerance for jank, confusion, or friction.

**Emotional job:** Excitement, competition, and glamour. Users are at parties, on couches, checking their phones between envelope openings. Every interaction must be fast, clear, and satisfying.

**Foundation:** Dark mode, always. This is a nighttime event app — dark backgrounds feel natural and premium. Gold as the singular accent color ties directly to the Oscar statuette and ceremony aesthetic.

**Layout:** Mobile-first responsive. 80%+ of users will be on phones during the ceremony. Desktop is for pre-event setup and host administration.

---

## Priority Tiers

| Tier | Audience | Goal | Quality Bar |
|------|----------|------|-------------|
| **P1** | Participants | Browse categories, make picks, check leaderboard, place wagers | Flawless on mobile. One-thumb operation. Zero confusion. Sub-200ms interactions. |
| **P2** | Host/Admin | Manage academy, lock/unlock, set winners, create bonus events, ceremony mode | Clear controls, confirmation on destructive actions, real-time feedback. Desktop-optimized, mobile-functional. |
| **P3** | Creator/Sysadmin | Deploy, seed data, manage infrastructure, debug | CLI + admin panel. Functional over beautiful. |

---

## Color System

### Heritage Palette (from original app)

The original Oscars app established a black/gold identity. We evolve it with modern refinements while preserving the DNA.

```css
:root {
  /* === Surface System === */
  --surface-base:        #0D0D0D;     /* True dark — app background */
  --surface-raised:      #161616;     /* Cards, panels */
  --surface-overlay:     #1C1C1C;     /* Modals, dropdowns, popovers */
  --surface-sunken:      #080808;     /* Inset areas, input backgrounds */
  --surface-interactive: #1F1F1F;     /* Hover states on surfaces */

  /* === Gold System (primary accent) === */
  --gold-muted:    #8B7430;   /* Disabled, tertiary text on dark */
  --gold:          #C29F3F;   /* Primary gold — inherited from original */
  --gold-bright:   #DAB94E;   /* Hover state, emphasis */
  --gold-vivid:    #F7CB50;   /* Active/pressed, highlights */
  --gold-flash:    #FFDB53;   /* Winner announcements, celebrations */
  --gold-glow:     rgba(199, 163, 65, 0.15);  /* Ambient glow behind gold elements */

  /* === Text System === */
  --text-primary:    #F0ECE4;   /* Warm white — primary text */
  --text-secondary:  #A8A29E;   /* Muted — secondary info */
  --text-muted:      #6B6560;   /* Hints, placeholders */
  --text-faint:      #3D3A37;   /* Borders that read as text-like */
  --text-on-gold:    #1A1400;   /* Dark text on gold backgrounds */

  /* === Semantic: Picks === */
  --pick-1:          #23CF30;   /* 1st pick — green (original) */
  --pick-1-glow:     rgba(35, 207, 48, 0.25);
  --pick-2:          #1F7CC2;   /* 2nd pick — blue (original) */
  --pick-2-glow:     rgba(31, 124, 194, 0.25);

  /* === Semantic: Status === */
  --status-correct:  #23CF30;   /* Correct prediction */
  --status-wrong:    #E54C35;   /* Wrong prediction (original) */
  --status-pending:  #A8A29E;   /* Not yet resolved */
  --status-locked:   #E54C35;   /* Picks locked */
  --status-open:     #23CF30;   /* Picks open */

  /* === Semantic: Wagers === */
  --wager-safe:      #1F7CC2;   /* Conservative wager */
  --wager-risky:     #E5A435;   /* Medium risk */
  --wager-yolo:      #E54C35;   /* High-risk wager */

  /* === Borders === */
  --border:          rgba(255, 255, 255, 0.08);
  --border-subtle:   rgba(255, 255, 255, 0.04);
  --border-gold:     rgba(194, 159, 63, 0.3);
  --border-strong:   rgba(255, 255, 255, 0.15);
}
```

### Color Rules

1. **Gold is the only accent.** No other decorative colors. Green, blue, red appear only for semantic meaning (picks, status).
2. **Surfaces define hierarchy** via darkness levels, not color.
3. **Text warmth** — use warm whites (`#F0ECE4`) not cool whites (`#FFFFFF`). This matches the gold palette and feels cinematic.
4. **Glow effects** are reserved for: winner announcements, selected picks, and celebration moments. Never decorative.

---

## Typography

```css
:root {
  /* Font stack — geometric sans for modernity */
  --font-display: 'Geist', 'Inter', -apple-system, sans-serif;
  --font-body:    'Geist', 'Inter', -apple-system, sans-serif;
  --font-mono:    'Geist Mono', 'JetBrains Mono', monospace;

  /* Scale */
  --text-xs:   0.6875rem;   /* 11px — fine print */
  --text-sm:   0.75rem;     /* 12px — labels, captions */
  --text-base: 0.875rem;    /* 14px — body text */
  --text-md:   1rem;        /* 16px — emphasized body */
  --text-lg:   1.125rem;    /* 18px — section headers */
  --text-xl:   1.5rem;      /* 24px — page titles */
  --text-2xl:  2rem;        /* 32px — hero numbers (scores) */
  --text-3xl:  3rem;        /* 48px — celebration/winner display */

  /* Weights */
  --weight-light:    300;    /* Score numbers, display text */
  --weight-normal:   400;    /* Body text */
  --weight-medium:   500;    /* Labels, navigation */
  --weight-semibold: 600;    /* Headings, emphasis */

  /* Tracking */
  --tracking-tight:  -0.02em;  /* Headlines */
  --tracking-normal: 0;        /* Body */
  --tracking-wide:   0.04em;   /* Uppercase labels */
}
```

### Typography Rules

- **Category names** in semibold, gold. These are the primary scanning targets.
- **Nominee names** in normal weight, primary text color.
- **Scores** in light weight, large size, monospace with `tabular-nums`. Scores are data.
- **Point values** (+5, +3) always monospace.
- **Uppercase** only for small labels (LOCKED, OPEN, 1ST PICK). Always with `tracking-wide`.

---

## Spacing & Grid

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-pill: 9999px;
}
```

### Layout

- **Mobile:** Single column, full-width cards. No horizontal scrolling ever.
- **Tablet:** 2-column grid for category cards.
- **Desktop:** 3-column grid for categories, sidebar for leaderboard.
- **Max content width:** 1200px centered.
- **Card padding:** 16px consistently. Symmetrical always.

---

## Depth & Elevation

**Strategy: Borders + subtle glow on dark.** Shadows are nearly invisible on dark backgrounds. We use:

1. **Border separation** — `0.5px solid var(--border)` defines card edges.
2. **Surface color shifts** — `--surface-raised` on `--surface-base` creates natural lift.
3. **Gold glow** — Reserved for interactive/selected states. Feels like a spotlight.

```css
/* Card default */
.card {
  background: var(--surface-raised);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-md);
}

/* Card hover */
.card:hover {
  border-color: var(--border-gold);
  background: var(--surface-interactive);
}

/* Selected / active pick */
.card.selected {
  border-color: var(--gold);
  box-shadow: 0 0 12px var(--gold-glow);
}

/* Winner announcement — theatrical */
.card.winner {
  border-color: var(--gold-vivid);
  box-shadow:
    0 0 20px rgba(199, 163, 65, 0.3),
    0 0 40px rgba(199, 163, 65, 0.1);
}
```

---

## Component Specifications

### Navigation (Mobile — P1 Priority)

Bottom tab bar, not top navbar. Users are holding phones with one hand at a party.

```
+------------------------------------------+
|                                          |
|            [page content]                |
|                                          |
+------------------------------------------+
| Categories | Leaderboard | Bonus | Menu  |
|     []     |     []      |  []   |  []   |
+------------------------------------------+
```

- 4 tabs max. Icons + single-word labels.
- Active tab: gold icon, gold label, gold top border (2px).
- Inactive: `--text-muted` icon and label.
- Tab bar: `--surface-base` with `--border` top edge. Fixed position.
- Height: 56px (thumb-friendly).
- Safe area inset padding for notched phones.

### Navigation (Desktop — P2/P3)

Sidebar, collapsible. Academy name at top, navigation items below.

- Width: 240px expanded, 56px collapsed (icons only).
- Active item: `--surface-interactive` background, gold left border (2px), gold text.
- Inactive: `--text-secondary`, no background.

---

### Category Card (The Core Unit)

This is the most-viewed, most-interacted element. It must be perfect.

**States:**
1. **Open, no pick** — Default. Shows category name, nominee count, "Make your picks" CTA.
2. **Open, picks made** — Shows your 1st and 2nd pick with color indicators.
3. **Locked** — Grayed out CTA, LOCKED badge, picks still visible.
4. **Resolved (winner announced)** — Winner highlighted in gold glow, your score shown (+5, +3, or +0).

```
Mobile Card (Open, no pick):
+------------------------------------------+
| BEST PICTURE                        OPEN |
|                                          |
| 10 nominees                              |
|                                          |
| [  Make Your Picks  ]                    |
+------------------------------------------+

Mobile Card (Picks made):
+------------------------------------------+
| BEST PICTURE                        OPEN |
|                                          |
| 1ST  Anora                         +5    |
| 2ND  The Brutalist                 +3    |
|                                          |
+------------------------------------------+

Mobile Card (Resolved — got 1st right):
+------------------------------------------+
| BEST PICTURE                     +5 pts  |
|                                          |
| [winner glow]                            |
| * Anora *                                |
|                                          |
| 1ST  Anora              CORRECT    +5    |
| 2ND  The Brutalist       wrong     +0    |
+------------------------------------------+
```

- Category name: `--text-sm`, `--weight-semibold`, `--tracking-wide`, uppercase, gold.
- Status badge: pill shape, uppercase, tiny. Green for OPEN, red for LOCKED.
- Pick indicators: colored left border (3px). Green = 1st, Blue = 2nd.
- Score: monospace, right-aligned. Green for points earned, muted for zero.
- Winner state: gold glow border on card, winner name in `--gold-flash`.

---

### Pick Selection Flow (P1 Critical Path)

This is the make-or-break interaction. Tapping "Make Your Picks" opens a full-screen modal on mobile (bottom sheet on tablet+).

```
Pick Selection (full screen mobile):
+------------------------------------------+
|  < Back            BEST PICTURE          |
+------------------------------------------+
|                                          |
|  Tap to select your 1st pick (5 pts)     |
|                                          |
|  +--------------------------------------+|
|  | Anora                                ||
|  +--------------------------------------+|
|  | The Brutalist                        ||
|  +--------------------------------------+|
|  | Conclave                             ||
|  +--------------------------------------+|
|  | ...                                  ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+

After 1st pick selected:
+------------------------------------------+
|  < Back            BEST PICTURE          |
+------------------------------------------+
|                                          |
|  1ST PICK (5 pts):                       |
|  [green] Anora                    [x]    |
|                                          |
|  Now select your 2nd pick (3 pts)        |
|                                          |
|  +--------------------------------------+|
|  | The Brutalist                        ||
|  +--------------------------------------+|
|  | Conclave                             ||
|  +--------------------------------------+|
|  | ...                                  ||
|  +--------------------------------------+|
|                                          |
| [        Confirm Picks        ]          |
+------------------------------------------+
```

- **Two-step flow**: Select 1st, then 2nd. Clear instruction text at each step.
- Selected 1st pick moves to top with green indicator and clear button (x).
- Remaining nominees shown for 2nd pick selection (1st pick removed from list).
- **Confirm button** appears only after both picks made. Gold background, dark text. Large touch target (48px min height).
- **Haptic feedback** on selection (via Vibration API where supported).
- Changing picks: tap the (x) to clear, re-select. Or tap a different nominee to swap.

---

### Leaderboard (P1)

```
+------------------------------------------+
|  LEADERBOARD                    24/24    |
+------------------------------------------+
|                                          |
|  1.  Alex S.              87 pts   []   |
|  2.  Jordan M.            82 pts   []   |
|  3.  Sam T.               79 pts   []   |
|  ─────────────────────────────────────   |
|  7.  You (Tyler)          64 pts   []   |
|  ─────────────────────────────────────   |
|  8.  Chris R.             61 pts   []   |
|  ...                                     |
+------------------------------------------+
```

- Current user always visible, pinned with separator lines if not in top view.
- Rank numbers: monospace, gold for top 3.
- Points: monospace, `tabular-nums`, right-aligned.
- Top 3 get subtle differentiation (gold text for 1st, silver-ish for 2nd, bronze-ish for 3rd — but subtle, not garish).
- Expandable rows: tap to see that player's picks breakdown.
- **Live indicator**: pulsing dot when scores are updating during ceremony.
- "24/24" shows how many categories have been resolved.

---

### Bonus Events & Wagers (P1)

```
Bonus Event Card:
+------------------------------------------+
| BONUS EVENT                    2 pts     |
|                                          |
| Will someone cry during their            |
| acceptance speech?                       |
|                                          |
| [  Yes  ]    [  No  ]                   |
|                                          |
| WAGER (optional)                         |
| Bet [1] [2] [3] [4] [5] pts             |
| Risk: 2x return or lose wager            |
+------------------------------------------+
```

- Bonus cards visually distinct from category cards — slightly different border treatment (dashed gold border or subtle gold tint on surface).
- Wager chips: pill-shaped buttons. Selected = gold fill. Unselected = outline.
- Risk warning: `--text-muted`, small. Not alarming, just informative.
- Resolved bonus: show result with points gained/lost prominently.

---

### Host/Admin Dashboard (P2)

```
Admin — Ceremony Mode:
+------------------------------------------+
| CEREMONY CONTROL              [LIVE]     |
+------------------------------------------+
|                                          |
| [  Lock All Remaining  ]  [Unlock All]  |
|                                          |
| BEST PICTURE                      OPEN  |
| [ Set Winner v ]  [ Lock ] [ Unlock ]   |
|                                          |
| BEST DIRECTOR                   LOCKED  |
| [ Set Winner v ]  [ Lock ] [ Unlock ]   |
|                                          |
| BEST ACTRESS                  RESOLVED  |
| Winner: Mikey Madison           [Edit]  |
|                                          |
| ─────────────────────────────────────    |
| BONUS EVENTS                             |
| [+ Create Bonus Event]                   |
|                                          |
| "Will someone cry?"              OPEN   |
| [ Yes ] [ No ] [ Resolve ]              |
+------------------------------------------+
```

- **Ceremony mode**: toggle that enables a streamlined, linear flow for marking winners as they're announced live.
- "Set Winner" is a dropdown of nominees for that category.
- Destructive actions (unlock after lock, edit resolved winner) require confirmation.
- Status colors: green dot = OPEN, red dot = LOCKED, gold dot = RESOLVED.
- **Bulk actions** at top: Lock All, Unlock All with confirmation modal.
- Member management in separate tab: approve/deny join requests, remove members.

---

### Academy Management (P2)

```
Academy Settings:
+------------------------------------------+
| My Academy                               |
| "Alex's Oscar Party 2026"         [Edit] |
+------------------------------------------+
|                                          |
| INVITE LINK                              |
| oscars2026.alexhacks.life/join/a1b2c3   |
| [Copy Link]  [Regenerate]               |
|                                          |
| MEMBERS (12)                             |
| Alex S. (you)              HOST          |
| Jordan M.                  MEMBER  [x]   |
| Sam T.                     MEMBER  [x]   |
|                                          |
| PENDING REQUESTS (2)                     |
| Chris R.          [Approve] [Deny]       |
| Pat W.            [Approve] [Deny]       |
+------------------------------------------+
```

---

## Animation & Transitions

### Principles
- **150ms** for micro-interactions (button press, toggle, tab switch).
- **200ms** for panel transitions (modal open, sheet slide).
- **300ms** for page transitions.
- **Easing:** `cubic-bezier(0.25, 1, 0.5, 1)` — fast start, gentle settle.
- **No bouncy/spring animations.** This is the Oscars, not a kids' app.

### Ceremony-Night Animations (the exceptions)

These are the theatrical moments. Tasteful, not overwhelming:

1. **Winner reveal**: Card border transitions from `--border` to `--gold-vivid` over 500ms with expanding glow. Category name pulses once to `--gold-flash`.
2. **Score update**: Counter animates up (number ticks from old to new value, 300ms).
3. **Leaderboard reorder**: Rows slide to new positions (250ms, staggered 50ms per row).
4. **Wager result**: Win = brief gold shimmer on the points gained. Loss = points fade to red, then settle to muted.

### What Never Animates
- Navigation (instant tab switches, no slide transitions between pages).
- Loading states (simple gold spinner or skeleton, no flashy loaders).
- Form interactions (instant state changes on toggles, checkboxes).

---

## Interaction Patterns

### Touch Targets
- **Minimum:** 44x44px for all tappable elements (Apple HIG).
- **Preferred:** 48x48px for primary actions.
- **Spacing between targets:** 8px minimum to prevent mis-taps.

### Feedback
- **Tap:** Subtle scale (0.98) + opacity (0.9) on press, 100ms.
- **Selection:** Border color change + glow. Immediate, no delay.
- **Destructive action:** Confirmation modal, always. Red text on the confirm button.
- **Success:** Brief green check icon, auto-dismisses after 1.5s. No toast pileup.

### Error States
- **Network failure:** Inline banner at top, gold border, "Connection lost. Retrying..." with auto-retry. Never lose user's picks — queue locally and sync.
- **Pick conflict (locked while selecting):** Modal explaining the category was just locked. Apologetic tone. Clear dismiss.
- **Session expired:** Full-screen re-auth prompt. Preserve state, resume after login.

### Offline Resilience (Critical for ceremony night)
- All current picks and leaderboard data cached locally.
- Picks made offline are queued and synced when connection resumes.
- Visual indicator when operating offline (subtle amber dot on connection status).
- Service worker pre-caches the app shell.

---

## Responsive Breakpoints

```css
/* Mobile first */
--bp-sm:  480px;   /* Large phones */
--bp-md:  768px;   /* Tablets */
--bp-lg:  1024px;  /* Small desktop */
--bp-xl:  1280px;  /* Full desktop */
```

### Mobile (< 768px) — P1 Surface
- Bottom tab navigation.
- Full-width category cards, single column.
- Pick selection as full-screen modal.
- Leaderboard as dedicated tab.
- Swipe gestures: swipe between categories (optional).

### Tablet (768px - 1024px)
- Bottom tab navigation (larger targets).
- 2-column category grid.
- Pick selection as bottom sheet (60% height).
- Leaderboard in slide-out panel.

### Desktop (> 1024px) — P2/P3 Surface
- Sidebar navigation.
- 3-column category grid.
- Pick selection as right panel or modal.
- Leaderboard as persistent sidebar.
- Admin controls accessible inline.

---

## Loading & Empty States

### Skeleton Screens
- Category cards: gold-tinted skeleton blocks pulsing at 1.5s intervals.
- Leaderboard: row skeletons with monospace-width placeholders.
- Never show spinners for page loads. Skeletons only.

### Empty States
- **No academies joined:** "Create your own Oscar party or join one with an invite link." + CTAs.
- **No picks made:** Category cards show "Make Your Picks" CTA prominently.
- **No bonus events:** (Host view) "Add bonus events to spice up the competition."
- **Ceremony not started:** Countdown timer to ceremony start. Elegant, centered, large display numbers.

---

## Iconography

**Phosphor Icons** (`@phosphor-icons/react`), `regular` weight for UI, `fill` for active states.

Key icons:
- Categories: `Trophy`
- Leaderboard: `ChartBar`
- Bonus: `Sparkle` or `Dice`
- Menu/Settings: `GearSix`
- Lock: `Lock` / `LockOpen`
- Pick 1st: `Medal` (or numbered circle)
- Pick 2nd: `Medal` (smaller, blue-tinted)
- Winner: `Star` with fill
- Wager: `CoinVertical`
- Admin: `Crown`

---

## Accessibility

- **Contrast:** All text meets WCAG AA on dark backgrounds. Gold on dark = 4.8:1 (passes AA).
- **Color not sole indicator:** Pick 1st/2nd distinguished by position AND color AND label ("1ST"/"2ND").
- **Focus states:** Gold outline (2px) on keyboard focus. Visible on all interactive elements.
- **Screen reader:** Semantic HTML, ARIA labels on icons, role="status" on live-updating scores.
- **Reduced motion:** Respect `prefers-reduced-motion`. Disable glow animations, score ticking. Instant state changes instead.

---

## Performance Budget

| Metric | Target | Rationale |
|--------|--------|-----------|
| First Contentful Paint | < 1.5s | Party guests won't wait |
| Largest Contentful Paint | < 2.5s | Category grid must render fast |
| Time to Interactive | < 3s | Pick-making must be instant |
| Bundle size (gzipped) | < 200KB | Works on spotty party WiFi |
| API response (picks) | < 100ms | Feels instant |
| Offline capability | Full read, queued writes | WiFi will fail at parties |

---

## Night-Of Reliability Checklist

This app has ONE night per year. These are non-negotiable:

1. **Pre-ceremony testing:** Full flow test 24h before. Picks, scoring, leaderboard, bonus events, wagers.
2. **CDN caching:** Static assets on CloudFront. API behind API Gateway with throttling.
3. **Graceful degradation:** If API is slow, show cached data with "updating..." indicator.
4. **No deploys during ceremony.** Lock deployment pipeline 2h before ceremony starts.
5. **Error monitoring:** CloudWatch alarms on Lambda errors, API Gateway 5xx rates.
6. **Capacity:** DynamoDB on-demand (auto-scales). Lambda concurrent execution > 100.
7. **Local state persistence:** Picks saved to localStorage immediately on selection. Server sync is secondary.
8. **Connection recovery:** Exponential backoff on failed API calls. Max 3 retries, then queue for later.

---

## Visual Identity Summary

| Element | Treatment |
|---------|-----------|
| Background | Near-black (#0D0D0D), never pure black |
| Cards | Raised surface (#161616) with hairline border |
| Primary accent | Gold (#C29F3F) — links, CTAs, active states |
| Text | Warm white (#F0ECE4), never pure white |
| 1st Pick | Green (#23CF30) with glow |
| 2nd Pick | Blue (#1F7CC2) with glow |
| Error/Wrong | Red (#E54C35) |
| Winner | Gold flash (#FFDB53) with theatrical glow |
| Typography | Geist/Inter, geometric sans |
| Icons | Phosphor, regular weight |
| Corners | 8px standard, 4px for small elements |
| Depth | Borders > shadows. Glow reserved for emphasis. |

This is the Oscars. Every pixel should feel like it's wearing a tuxedo.
