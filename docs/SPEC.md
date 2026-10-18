# GreenCo Work Orders: Implementation Prompt & Checklist

Prepared for Ramesh Madavaram · Plant Work Orders & Maintenance Planner case · 17 Oct 2026

## How to use this document

Paste Sections 1 to 11 into your AI coding tool (Claude Code, Cursor, etc.) as the build prompt. Work through it one step at a time and review each step before moving on. Section 12 is your own progress checklist.

## 1. Role and goal

You are a senior React Native engineer. Build an offline-first, mobile-first vertical slice called **GreenCo Work Orders** for technicians at a renewable-energy plant (wind turbines, inverters, pumps). It is a take-home case with a maximum of 8 focused hours. It is judged on a working end-to-end demo, original polished design, clean minimal architecture, one automated test and honest reasoning. It is not judged on feature count. Do not build anything outside the scope in Section 2.

## 2. Hard constraints

- Stack: **React Native + Expo (managed, runs in Expo Go) + TypeScript + expo-sqlite**.
- Cost: $0. No paid service, no cloud, no public deployment.
- **No real backend and no GraphQL.** The server is an in-app simulator.
- Out of scope (do not build): assignment scheduler, calendar view, multi-user merge, file attachments, live server, auth, push notifications, pull sync.
- Keep it minimal: no Redux, no DI framework, no use-case classes. Plain TypeScript interfaces, repositories, services and hooks.
- Conflict resolution is optional. Explain it in one sentence in the architecture note.

## 3. Required screens (exactly three)

1. **Overview:** work order list with priority and status filters.
2. **Detail:** one work order with its status history.
3. **Action:** create or update a work order, with validation.

Navigation is a simple stack with expo-router: `index` (Overview) → `order/[id]` (Detail) → `order/edit` (Action). The Action screen is reused for create (from a New order button on Overview) and edit (from Detail). No bottom tabs.

## 4. Mandatory offline behaviour

- Persistent datastore: **SQLite**. Nothing important lives only in memory.
- An **offline toggle** (labelled Simulate Offline) on Overview. Its value is stored in SQLite so it survives a restart.
- Every create or update writes to the local `work_orders` table immediately and queues exactly one row in the `outbox` table, in one transaction.
- Every queued change has a **unique mutation ID** (UUID).
- A **visible pending count** (number of outbox rows) on Overview, plus a Pending tag on affected orders.
- A **Sync Now** button. Disabled while offline or while a sync is running.
- Sync Now sends the outbox to the mock server in order. Tapping Sync Now **twice** must not duplicate any effect.
- After a full app reload or relaunch, the locally modified record is still visible and still unsynced.
- After sync: pending count is 0 and the record shows a visible **Synced** state.
- Real cloud sync is not required. The mock server is an in-app module.

## 5. Data

The bundled CSV `work_orders.csv` has 4 rows and these columns:

`wo_id, asset_id, title, priority, status, assigned_to, due_date, updated_at, revision`

| wo\_id | asset\_id | title | priority | status | assigned\_to | due\_date | updated\_at | revision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WO-1001 | WTG-101 | Inspect turbine gearbox | High | Open | Technician A | 2026-10-19 | 2026-10-14T08:00:00Z | 2 |
| WO-1002 | INV-201 | Review inverter fault | Critical | In Progress | Technician B | 2026-10-16 | 2026-10-14T09:30:00Z | 1 |
| WO-1003 | PMP-301 | Hydraulic vibration check | Medium | Open | Technician C | 2026-10-22 | 2026-10-13T11:00:00Z | 3 |
| WO-1004 | WTG-102 | Lubrication schedule | Low | Completed | Technician A | 2026-10-11 | 2026-10-14T10:30:00Z | 4 |

Rules:

- Valid statuses: `Open`, `In Progress`, `Completed`. Valid priorities: `Low`, `Medium`, `High`, `Critical`.
- Convert the CSV once to `assets/workOrders.json` (a 5-line Node script, or papaparse). Keep the original CSV in `data/`.
- Add 8 to 12 extra synthetic rows in the same format so the filters and chart look meaningful: mix all priorities and statuses, at least one overdue non-completed order (due date before 2026-10-17), and at least one more Completed order.
- On first launch only: seed `work_orders` and one initial `status_history` row per order, and seed the mock server table `server_orders` with the same data. After that, the JSON is never read again. SQLite is the source of truth.
- `revision` is a per-record version. Increment it on every local edit and send `base_revision` in the mutation payload. A real backend would use it for conflict detection.

## 6. Architecture (minimal but with clean seams)

Layers, each talking only to the one below:

```
UI screens + components (Overview, Detail, Action, OfflineToggle, PendingBadge, SyncButton)
   ↓ hooks (useWorkOrders, usePendingCount, useSync, useOffline)
Services (workOrderService, syncService)
   ↓                         ↓
Repos (SQLite, all SQL here)   SyncTransport interface → MockSyncTransport
```

Two interfaces isolate everything that would change with a real backend:

```ts
interface WorkOrderSource { fetchAll(): Promise<WorkOrder[]>; }   // JsonSeedSource now, ApiSource later
interface SyncTransport {
  push(m: Mutation): Promise<'accepted' | 'duplicate' | 'rejected'>; // MockSyncTransport now, HttpSyncTransport later
}
```

`syncService` receives a `SyncTransport` through its constructor and never imports the mock directly. Tests inject a fake.

Suggested folders:

```
src/
  domain/      types.ts, validation.ts, theme.ts
  data/        db.ts (open + migrations), workOrderRepo.ts, outboxRepo.ts, settingsRepo.ts
  sync/        syncService.ts, transport.ts (interface), mockTransport.ts
  seed/        JsonSeedSource.ts, seed.ts
  hooks/       useWorkOrders.ts, usePendingCount.ts, useSync.ts
  ui/          StatusChip, PriorityChip, StatusBar (chart), EmptyState, SyncBar, OfflineToggle
app/           index.tsx, order/[id].tsx, order/edit.tsx, _layout.tsx
__tests__/     sync.test.ts, validation.test.ts
```

State approach: React hooks reading from SQLite, with a small refresh mechanism after writes. No global store.

## 7. SQLite schema

Client tables:

```sql
CREATE TABLE work_orders (
  wo_id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, title TEXT NOT NULL,
  priority TEXT NOT NULL, status TEXT NOT NULL, assigned_to TEXT,
  due_date TEXT, updated_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
  pending_sync INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, wo_id TEXT NOT NULL,
  from_status TEXT, to_status TEXT NOT NULL, changed_at TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (wo_id) REFERENCES work_orders(wo_id)
);
CREATE TABLE outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  mutation_id TEXT NOT NULL UNIQUE,
  wo_id TEXT NOT NULL, type TEXT NOT NULL,   -- create | update
  payload TEXT NOT NULL,                      -- JSON incl. base_revision
  created_at TEXT NOT NULL
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- offline toggle
```

Mock server tables (keep clearly separated in code, ideally in `sync/mockTransport.ts` with its own tables or its own DB file):

```sql
CREATE TABLE server_orders (wo_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE processed_mutations (mutation_id TEXT PRIMARY KEY, processed_at TEXT NOT NULL);
```

Use `seq` (auto-increment), not timestamps, for outbox ordering. Keep `created_at` only for display.

## 8. Core algorithms

**Save (create or update), one transaction:**

1. Validate input (see Section 9). Stop on error and show messages.
2. In one transaction: upsert `work_orders` (revision + 1, `pending_sync = 1`, new `updated_at`); if status changed insert a `status_history` row; insert an `outbox` row with a new UUID mutation ID.
3. Refresh the list and pending count. The UI reads only local data and never waits for sync.

**Sync Now:**

1. If offline or `isSyncing` is already true, return immediately (lock prevents a double-tap race).
2. Set `isSyncing = true`. Read the outbox `ORDER BY seq ASC`.
3. For each row call `transport.push(mutation)`. On `accepted` or `duplicate`: delete the outbox row, and when that order has no more outbox rows set `pending_sync = 0` and mark its history rows `synced = 1`. On `rejected` or an error: keep the row and stop the loop so it retries next time.
4. In `finally`: set `isSyncing = false` and refresh the pending count.

**Mock server `push` (idempotency):**

1. If `mutation_id` exists in `processed_mutations`, return `duplicate` and change nothing.
2. Otherwise, in one server-side transaction: upsert `server_orders` and insert into `processed_mutations`. Return `accepted`.
3. The duplicate check uses the **mutation ID**, never the work order ID. The same order can legitimately be edited many times.
4. Add a short artificial delay (for example 600 ms) so the loading state and the double-tap lock are visible in the demo.

## 9. UI design spec (iOS-style, light theme default)

Reference mockups for every screen, in light and dark: https://claude.ai/artifact/42MAXFJdLrfkGQAiSQu6uh

**Style:** clean, Apple-style (iOS Human Interface look). Large title navigation, inset grouped lists, 16px corner radius, hairline separators, plenty of white space, one clear action per screen. **Font: the system font** (San Francisco on iOS, Roboto on Android); do not install custom font packages. All tappable controls are at least 44px tall, primary buttons 50 to 52px (technicians wear gloves).

**Theme:** the **light theme is the default** because it stays readable in direct sunlight at remote sites, and it is the one used for screenshots. The dark theme follows the phone setting through `useColorScheme()` (night shifts, dim equipment rooms, OLED battery). Keep every color as a token in one `theme.ts` with a `light` and a `dark` object. Never build a screen with hard-coded colors.

**Core tokens**

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#F2F2F7` | `#000000` |
| Card | `#FFFFFF` | `#1C1C1E` |
| Separator | `#E5E5EA` | `#38383A` |
| Text | `#000000` | `#FFFFFF` |
| Secondary text | `#6C6C70` | `#98989F` |
| Brand / primary button | `#0F8A5F` with white text | `#30D158` with dark text `#00210E` |
| Segmented control track / selected | `#E6E6EB` / `#FFFFFF` | `#1C1C1E` / `#636366` |

**Status, priority and sync colors (light theme)**

| Meaning | Fill or dot | Text | Tint background |
| --- | --- | --- | --- |
| Open | `#007AFF` | `#007AFF` | `#E5F0FF` |
| In Progress | `#FF9500` | `#B25E00` | `#FFF0D6` |
| Completed | `#34C759` | `#1E7A34` | `#DDF6E3` |
| Critical | `#FF3B30` | `#D70015` | `#FFE5E3` |
| High | `#FF9500` | `#B25E00` | `#FFF0D6` |
| Medium | `#FFCC00` | `#8A6100` | none |
| Low | `#8E8E93` | `#6C6C70` | none |
| Pending sync | none | `#5E4BD1` | `#ECE9FF` |
| Offline | `#FF9500` | `#B25E00` | `#FFF0D6` |
| Online | `#34C759` | `#1E7A34` | `#DDF6E3` |

In the dark theme use brighter versions of the same tokens (for example Critical text `#FF6961`, Completed `#30D158`). Never rely on color alone: every status and priority also has a text label. Purple is used only for sync state, so it is never confused with status or priority.

**Offline control (top right of the navigation bar on Overview and Detail):** a compact capsule that is also the toggle. Offline shows an amber capsule reading Offline with the switch on. Online shows a green capsule reading Online with the switch off. Tapping it flips the mode, and the value is stored in SQLite.

**Overview screen**

```
                                  [⊘ Offline ●━]   capsule, top right
Work Orders                                          large title
┌────────────────────────────────────────────┐
│ 4 work orders                      1 overdue │
│ ████████ ████ ████        thin status bar    │
│ ● Open 2  ● In Progress 1  ● Completed 1     │
│ ────────────────────────────────────────── │
│ ☁↑ 2 changes waiting          [ Sync Now ]   │
└────────────────────────────────────────────┘
[ All | Open | In Progress | Completed ]       segmented control
Sorted by urgency                 Priority: All ▾
┌────────────────────────────────────────────┐
│ ▣ Review inverter fault                 ☁ ›  │
│   Critical · WO-1002 · INV-201               │
│   ● In Progress · Overdue 1d                 │
│ ────────────────────────────────────────── │
│ ▣ Inspect turbine gearbox                 ›  │
│   High · WO-1001 · WTG-101                   │
│   ● Open · Due Oct 19                        │
└────────────────────────────────────────────┘
                                [ + New Order ]  floating button
```

- **Summary card:** total count, overdue count in red, a thin stacked bar of Open, In Progress and Completed (this is the required small chart) with a legend, then the pending row.
- **Pending row:** shows the number of outbox rows. **Sync Now** is greyed out and disabled while offline or while a sync is running, and shows a spinner during sync. After a successful sync the row changes to a green check with All changes synced · just now, and the pending icons on the rows disappear.
- **Filters:** the segmented control filters by status. A Priority menu button (Any, Critical, High, Medium, Low) filters by priority.
- **List:** one inset grouped list sorted by urgency (overdue first, then priority, then due date). Each row has a colored icon tile in the style of iOS Settings: tile color shows priority and the glyph shows the asset type (turbine for WTG, inverter for INV, pump for PMP, gear for anything else). Line 1 is the title. Line 2 is the priority name in its color, then the WO ID and asset ID. Line 3 is a status dot with the status, then the due date or a red Overdue note. A purple cloud icon marks a pending change. Tapping a row opens Detail.
- **Empty state:** a centered icon, the title No Results, the text No Critical work orders are Completed. Try a different status or priority., and a Clear Filters button.

**Detail screen**

```
‹ Orders                              [⊘ Offline ●━]
▣  Review inverter fault
   WO-1002 · INV-201
[Critical] [In Progress] [Overdue 1d] [☁ Pending]
┌────────────────────────────────────────────┐
│ ✓ Open ────── ● In Progress ────── ○ Completed │  progress stepper
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Assigned to                    Technician B  │
│ Due                       Oct 16 · Overdue   │
│ Asset                     Inverter INV-201   │
└────────────────────────────────────────────┘
STATUS HISTORY
● Changed to In Progress   Oct 14, 09:30 · Technician B   [Pending]
● Created as Open          Oct 13, 14:10                  [Synced]
[ Edit ]   [        Mark Completed        ]     sticky bottom bar
```

- The history is read from `status_history`. Each entry shows a Pending or Synced badge.
- **Mark Completed** is a one-tap status change. It uses the same save and outbox path as the form, so it also queues one mutation.
- Edit opens the Action screen pre-filled with this order.

**Action screen (create or update)**

```
Cancel               New Work Order
┌────────────────────────────────────────────┐
│ Title                                        │  red outline when invalid
└────────────────────────────────────────────┘
 Enter a title with at least 3 characters.
┌ Asset                  WTG-101 · Wind Turbine › ┐
PRIORITY   [ Low | Medium | High | Critical ]
STATUS     [ Open | In Progress | Completed ]
┌ Due Date                         22 Oct 2026 ┐
┌ Assigned to                   Technician C › ┐
 You’re offline. This is saved on your device and syncs later.
[            Save Work Order            ]
```

- **Validation:** title is required with at least 3 characters; asset is required; priority and status are required; due date must be a valid date (YYYY-MM-DD). Show an inline red message under the field and a red outline. Do not write anything until the form is valid.
- **After a successful save:** go back, show the updated order with its purple Pending icon, and update the pending count.
- When offline, show the amber note above the Save button. It is hidden when online.

**Responsive and field use**

- Respect safe-area insets. On tablets and wide screens, center the content at a maximum width of about 640px.
- Support Dynamic Type (system font scaling) and keep text contrast at 4.5:1 or better, which is why status text uses the darker shades from the table.
- Keep the layout calm: no more than one summary card, one filter row and one list on Overview.

## 10. Step-by-step plan (about 8 hours)

1. **Setup and data (45 min).** Create the project, install dependencies, convert the CSV to JSON, add the extra rows.

```
npx create-expo-app@latest greenco-workorders --template blank-typescript
cd greenco-workorders
npx expo install expo-sqlite expo-crypto expo-router react-native-safe-area-context react-native-screens
npm install -D jest jest-expo @types/jest
```

(Check the current Expo docs for expo-router setup and the exact versions installed.) 2. **Data layer (1.5 h).** `db.ts` with migrations, the repos, settings repo, first-launch seed, transactions for save. 3. **Mock server (1 h).** `SyncTransport` interface, `MockSyncTransport` with its own tables and the idempotency check. 4. **Sync logic (1 h).** `syncService` with the lock, ordered outbox processing and retry-on-failure behaviour. 5. **Screens (2 h).** Overview, Detail, Action, offline toggle, pending badge, Sync Now, hooks. 6. **Design polish (1 h).** Theme file, chips, status bar chart, empty states, validation states, Synced transition. 7. **Tests, README, screenshots, demo (1 h).**

After each step, run the app and confirm it works before continuing.

## 11. Tests, README, demo and deliverables

**Tests (Jest with jest-expo; inject a fake transport and an in-memory or fake repo):**

1. **Required:** call `syncNow()` twice against the mock transport; assert exactly one effect on the server, the outbox is empty and the pending count is 0.
2. The same mutation ID pushed twice returns `duplicate` the second time.
3. Validation: an empty title returns an error message.

If running real SQLite in Jest is awkward, say so in the README and test through the repo interfaces with an in-memory fake.

**README must contain (exact commands):** install (`npm install`), run (`npx expo start`, then Expo Go or an emulator), test (`npm test`), how to reset the demo data, the offline demo checklist, architecture note, tradeoff, real-backend notes and the AI note.

**Architecture note (6 to 10 lines or a diagram) must cover:** UI components, state (hooks over SQLite, no global store), local persistence (SQLite), mock sync separation (two interfaces), one technology tradeoff, and what changes for a real multi-user backend.

- Tradeoff example: raw expo-sqlite over an ORM for speed and control; for production consider Drizzle for typed migrations. Expo managed workflow over bare for speed, at the cost of limited background sync.
- Real backend: auth, a REST or GraphQL API behind `HttpSyncTransport`, pull sync, per-record `revision` for server-side conflict detection and resolution, background sync, and a real server-side idempotency store.

**Demo script (3 minutes), in this order:**

1. Start from the README with bundled demo data.
2. Navigate Overview, Detail and Action.
3. Turn on Simulate Offline, edit or create an order, and show the pending count of 1 and the Pending tag.
4. Fully close and relaunch the app; show the edit is still there and still unsynced.
5. Turn offline off, tap Sync Now **twice**; show pending count 0, a Synced state and no duplicates.
6. Show one validation error, run the automated test, and briefly explain the AI-assisted workflow.

**Submission package:** source (ZIP or repository), README with exact commands, **2 screenshots** (Overview and Detail), the 3-minute demo or live walkthrough, the architecture note, at least one test, and an honest AI coding note (where AI helped, and what you decided and verified yourself).

## 12. Progress checklist

**Done so far (planning and design)**

| Status | Item |
| --- | --- |
| ✅ | Read the case files and understood the scope and expectations |
| ✅ | Chose stack: React Native + Expo + SQLite |
| ✅ | Decided: no real backend, no GraphQL (mention GraphQL only in the architecture note) |
| ✅ | Understood the outbox, mock server and mutation IDs |
| ✅ | Understood idempotency: duplicate check by mutation ID, not work order ID |
| ✅ | Decided to order mutations by auto-increment `seq`, not timestamps |
| ✅ | Inspected the real CSV (9 columns, 3 statuses, 4 rows) |
| ✅ | Designed the SQLite schema matched to the CSV, including `revision` |
| ✅ | Designed the save, sync and mock-server algorithms |
| ✅ | Designed the minimal architecture with two interfaces (`WorkOrderSource`, `SyncTransport`) |
| ✅ | Designed the UI: 3 screen mockups, colors, status hierarchy, navigation |
| ✅ | Planned the tests and the demo script |
| ✅ | Wrote this implementation prompt |
| ⬜ | Optional: obtain COMMON\_EVALUATION\_RUBRIC.md from the recruiter (not received) |

**To do (implementation)**

| Status | Item |
| --- | --- |
| ⬜ | Create the Expo project and install dependencies |
| ⬜ | Convert the CSV to JSON and add 8 to 12 extra rows |
| ⬜ | SQLite setup, migrations and first-launch seed |
| ⬜ | Repos and the transactional save |
| ⬜ | Mock server with the processed-mutations table |
| ⬜ | Sync service with lock, ordering and retry |
| ⬜ | Overview screen with filters, pending count, offline toggle, Sync Now |
| ⬜ | Detail screen with status history |
| ⬜ | Action screen with validation |
| ⬜ | Design polish: chips, status chart, empty states, Synced state |
| ⬜ | Tests (sync twice, duplicate mutation, validation) |
| ⬜ | Persistence check: relaunch keeps the offline edit |
| ⬜ | README with exact commands, architecture note, tradeoff, AI note |
| ⬜ | 2 screenshots |
| ⬜ | 3-minute demo recording or rehearsed walkthrough |
| ⬜ | Final package: ZIP or repository |

## 13. Building it with Google Antigravity: step-by-step prompts

Do not paste this whole document into the agent. Antigravity has an Agent Manager (where you start one task per workspace folder) and an Editor. It offers a Planning mode, where the agent writes an implementation plan before coding, and a Fast mode that executes directly. Use **Planning mode for Steps 1 to 8** and Fast mode only for small fixes. Menu labels may change between versions, so check them in the app.

**Working rules**

- One step is one Agent Manager task. Never combine steps.
- Read the implementation plan before you approve it. Reject any plan that adds Redux, GraphQL, a backend, extra screens or extra libraries.
- Choose a review setting that asks you before the agent runs terminal commands, so you see what it installs.
- After every step: run the app (`npx expo start`, then Expo Go on your phone), do the check listed, and commit. If something breaks, paste the error into the same task and ask for a fix.
- At the end of each step ask: Explain what you built in 5 lines. Save that explanation. It prepares you for the interview and feeds your honest AI note.
- Keep a file `AI_NOTES.md` and add 2 lines per step: what the AI generated, and what you checked or changed yourself.

### Step 0: setup (you do this by hand, not the agent)

1. Check Node is installed (`node -v`), then run:

```
npx create-expo-app@latest greenco-workorders --template blank-typescript
cd greenco-workorders
npx expo install expo-sqlite expo-crypto expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install -D jest jest-expo @types/jest
git init
git add -A
git commit -m 'chore: scaffold expo project'
```

2. Add these files to the project: `data/work_orders.csv` (the case file), `docs/SPEC.md` (export this document as Markdown), and `PROJECT_BRIEF.md` (below).
3. In Antigravity, open the `greenco-workorders` folder as the workspace and start a new task in the Agent Manager.
4. Install Expo Go on your phone and make sure the phone and computer are on the same Wi-Fi.

**PROJECT\_BRIEF.md** (the agent reads it in every step):

```
Project: GreenCo Work Orders. Offline-first mobile app for plant technicians.
Stack: Expo + TypeScript + expo-sqlite + expo-router. No backend, no Redux, no GraphQL, no extra screens.
Exactly 3 screens: Overview, Detail, Action (create/update).
Layers: UI screens -> hooks -> services -> repos (SQLite) and SyncTransport (mock server).
All SQL lives in src/data. Mock server tables are only touched from src/sync.
Two interfaces isolate backend changes: WorkOrderSource and SyncTransport.
Data columns: wo_id, asset_id, title, priority, status, assigned_to, due_date, updated_at, revision.
Statuses: Open, In Progress, Completed. Priorities: Low, Medium, High, Critical.
Offline rules: every save writes work_orders and exactly one outbox row in one transaction.
Each mutation has a UUID mutation_id. The outbox is processed in order of seq.
The mock server detects duplicates by mutation_id, never by work order id.
Sync Now has an isSyncing lock and is disabled while offline.
UI: iOS style, system font, light theme by default, dark theme from the system setting.
All colors come from src/domain/theme.ts tokens. Touch targets at least 44px.
Full detail is in docs/SPEC.md. Work on one step at a time, keep it minimal, explain what you changed.
```

### Step 1: structure, theme and navigation (about 45 min)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (sections 3, 6 and 9).
Task (Step 1 only, no SQLite yet):
1. Finish the expo-router setup in this existing Expo TypeScript project, following the current Expo docs (entry point, app.json scheme, any config needed).
2. Create the folders src/domain, src/data, src/sync, src/seed, src/hooks, src/ui and app.
3. Create src/domain/types.ts with WorkOrder, Priority, Status, Mutation and SyncResult types that match the CSV columns.
4. Create src/domain/theme.ts with light and dark token objects from section 9 and a useTheme() hook based on useColorScheme(). No hard-coded colors anywhere else.
5. Create placeholder screens: app/index.tsx (Overview), app/order/[id].tsx (Detail) and app/order/edit.tsx (Action), with a stack layout, a large-title header on Overview, and links that navigate between the three.
Do not add any other library. When done, give me the exact command to run and a 5-line explanation of each file.
```

Check: the app opens in Expo Go, you can move between the three screens, and switching the phone to dark mode changes the colors. Commit: `feat: project structure, theme, navigation`.

### Step 2: SQLite setup and seed data (about 1 h)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (sections 5 and 7).
Task (Step 2 only: data foundation, no UI):
1. Convert data/work_orders.csv to assets/workOrders.json with a small Node script scripts/csv-to-json.js. Then add 10 extra synthetic rows with the same columns: mix all priorities and statuses, at least one overdue non-completed order (due date before 2026-10-17), at least one more Completed order, and use asset prefixes WTG, INV and PMP. Keep the original 4 rows unchanged.
2. Create src/data/db.ts: open the database with expo-sqlite and run migrations (using PRAGMA user_version) that create work_orders, status_history, outbox, settings, server_orders and processed_mutations, using the schema in section 7.
3. Create src/seed/JsonSeedSource.ts implementing a WorkOrderSource interface (fetchAll), and src/seed/seed.ts that, on first launch only, inserts all orders, one initial status_history row per order, and a copy of each order into server_orders, all in one transaction.
4. Run DB init and the seed once at app start (root layout) and show a loading state until it is ready.
Explain the migration approach in 5 lines.
```

Check: the first launch loads without errors, a temporary log shows 14 orders, and a second launch does not seed again. Commit: `feat: sqlite schema and seed`.

### Step 3: repositories, validation and save (about 1.5 h)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (section 8, Save, and section 9, Action validation).
Task (Step 3 only: repositories and save logic, no UI):
1. Define interfaces WorkOrderRepo, OutboxRepo and SettingsRepo, and implement them with expo-sqlite in src/data.
2. Create src/domain/validation.ts with validateWorkOrder(input) that returns field errors: title required and at least 3 characters; asset id required; priority and status must be valid values; due date must be a valid YYYY-MM-DD date.
3. Create src/data/workOrderService.ts with saveWorkOrder(input): validate first; then in ONE transaction upsert work_orders (revision + 1 on update, new updated_at, pending_sync = 1), insert a status_history row when the status changes (or on create), and insert exactly one outbox row with a new UUID mutation_id (expo-crypto), type create or update, and a JSON payload that includes base_revision. Generate the next WO number for new orders.
4. Add query functions: list orders with optional status and priority filters sorted by urgency (overdue first, then priority, then due date), getOrder(id), getStatusHistory(id), getPendingCount(), and get/set for the offline setting.
No screens yet. Add a temporary dev-only function that saves one order and logs the outbox, and tell me how to run it.
```

Check: one save adds exactly one outbox row, sets `pending_sync = 1` and raises the revision by 1; invalid input returns errors and writes nothing. Remove the temporary function, then commit: `feat: repos, validation, transactional save`.

### Step 4: mock server, sync service and tests (about 1 h)

Mode: Planning. This is the heart of the case, so read the plan carefully.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (section 8, Sync Now and Mock server push, and section 11, Tests).
Task (Step 4 only: mock server, sync service and tests, no UI):
1. Create src/sync/transport.ts with the SyncTransport interface: push(mutation) returns 'accepted' | 'duplicate' | 'rejected'.
2. Create src/sync/mockTransport.ts: MockSyncTransport using the server_orders and processed_mutations tables. If the mutation_id is already in processed_mutations, return 'duplicate' and change nothing. Otherwise, in one transaction, upsert server_orders and insert processed_mutations, and return 'accepted'. Add a configurable short delay (default 600 ms).
3. Create src/sync/syncService.ts: a class that receives OutboxRepo, WorkOrderRepo and a SyncTransport in its constructor (it must never import the mock directly). syncNow(): return immediately if offline or isSyncing; set isSyncing; read the outbox ORDER BY seq ASC; push each mutation; on accepted or duplicate delete that outbox row and, when that order has no more outbox rows, set pending_sync = 0 and mark its history rows as synced; on rejected or error keep the row and stop; always clear isSyncing in a finally block. Return a summary {accepted, duplicates, remaining}.
4. Write Jest tests (jest-expo) using in-memory fakes for the repos and a fake transport: (a) two syncNow() calls fired together, then one more, produce exactly one server effect and an empty outbox; (b) pushing the same mutation id twice returns 'duplicate' the second time; (c) while offline nothing is sent. Add a test script to package.json and make npm test pass.
Explain how the tests avoid needing a real SQLite database.
```

Check: `npm test` is green. Also try breaking the lock on purpose and confirm test (a) fails. Commit: `feat: mock server, sync service, tests`.

### Step 5: hooks and the Overview screen (about 1 h)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (section 9: tokens, offline control and Overview screen).
Task (Step 5 only):
1. Create hooks in src/hooks: useWorkOrders(filters), usePendingCount(), useOffline() (reads and writes the stored setting), and useSync() (wraps syncService and exposes isSyncing, lastSyncedAt and syncNow). Use a simple refresh mechanism after writes (an event emitter or a version counter). No global store library.
2. Build app/index.tsx as described in section 9: large title Work Orders; the offline capsule at the top right that toggles the offline setting; a summary card with total, overdue count, a thin stacked status bar with legend, and the pending row with a Sync Now button (disabled while offline or syncing, spinner while syncing, then All changes synced · just now); a segmented control for status; a Priority menu for priority; an inset grouped list with colored icon tiles (priority color, asset-type glyph), three text lines per row and a purple pending cloud icon; a floating New Order button; and the empty state with a Clear Filters button.
3. Put reusable pieces in src/ui: OfflineCapsule, SummaryCard, StatusBar, OrderRow, EmptyState, SegmentedControl. Use only theme tokens and the system font. Minimum touch target 44px.
```

Check: every filter combination works; toggling offline disables Sync Now; the pending count and summary numbers are correct. Commit: `feat: overview screen`.

### Step 6: Detail screen (about 45 min)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (section 9, Detail screen).
Task (Step 6 only): build app/order/[id].tsx as specified: back button and the offline capsule; a header with the icon tile, title and IDs; badges for priority, status, Overdue and Pending; a progress stepper (Open, In Progress, Completed); grouped rows for assigned to, due date and asset; a status history list read from status_history with Pending or Synced badges; and a bottom bar with Edit (opens app/order/edit.tsx with the id) and Mark Completed (calls saveWorkOrder with status Completed so it queues one mutation). Handle a missing id with a friendly not-found state. Reuse src/ui components and theme tokens.
```

Check: history matches the data; Mark Completed adds one pending change and one history entry. Commit: `feat: detail screen`.

### Step 7: Action screen with validation (about 1 h)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (section 9, Action screen).
Task (Step 7 only): build app/order/edit.tsx for both create (no id) and edit (id param, pre-filled). Fields: Title, Asset, Priority (segmented), Status (segmented), Due Date, Assigned to. Use validateWorkOrder on Save: show an inline red message under each invalid field and a red outline, and write nothing until the form is valid. On success call saveWorkOrder, go back, and make sure the Overview shows the order with its Pending icon and the updated pending count. When offline show the amber note above the Save button. Keep inputs at least 44px tall and handle the keyboard so the Save button stays reachable.
```

Check: an empty title shows the error and saves nothing; a valid save adds one pending change; editing an existing order raises its revision. Commit: `feat: action screen`.

### Step 8: polish and states (about 1 h)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (section 9).
Task (Step 8 only, no new features): compare every screen with section 9 and fix spacing, alignment, type sizes, colors and touch targets. Make sure the empty state, the loading state, the syncing spinner, the All changes synced confirmation and the Pending to Synced transition all exist. Check that light and dark themes both look correct, safe areas are respected, and nothing uses a hard-coded color. Report each change you made as a short list.
```

Check: screenshots of Overview and Detail in the light theme (these are your two submission screenshots). Commit: `style: polish and states`.

### Step 9: final tests, README and demo prep (about 1 h)

Mode: Planning.

```
Read PROJECT_BRIEF.md and docs/SPEC.md (sections 6, 10 and 11).
Task (Step 9 only):
1. Add a validation test (an empty title returns an error) if it does not already exist, and confirm npm test passes.
2. Write README.md with: what the app is; exact commands (npm install, npx expo start, npm test); how to reset the demo data; the offline demo checklist from section 11; the architecture note (6 to 10 lines or a diagram covering UI components, state as hooks over SQLite, SQLite persistence, and mock sync separation through the WorkOrderSource and SyncTransport interfaces); one technology tradeoff; what would change for a real multi-user backend (auth, REST or GraphQL behind an HttpSyncTransport, pull sync, per-record revision for conflict detection, background sync); and a placeholder section for my honest AI note.
3. Do not change app behavior in this step.
```

Then you:

1. Fill in the AI note from your `AI_NOTES.md`.
2. Run the full demo script from section 11 twice, then record the 3-minute walkthrough.
3. Add the 2 screenshots and zip or push the repository.

### If the agent goes off track

```
Stop. You went beyond the current step. Revert any changes outside Step N, remove any library or screen I did not ask for, and keep the architecture in PROJECT_BRIEF.md. Then summarize what changed in 5 lines.
```

```
Here is the error I get when I run the app: [paste the error]. Find the root cause in the code, explain it in 3 lines, then fix only that.
```
