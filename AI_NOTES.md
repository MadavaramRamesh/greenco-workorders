# GreenCo Work Orders - AI Notes

Log of AI-assisted generation and engineer verification for each step.

### Step 1: Structure, theme and navigation
- **AI generated:** Folder structure (`src/domain`, `src/data`, `src/sync`, `src/seed`, `src/hooks`, `src/ui`, `app`), `types.ts`, `theme.ts` with light/dark tokens, and placeholder stack screens.
- **Checked/changed:** Verified Expo Router navigation stack, tested light/dark theme switching via `useColorScheme()`, confirmed zero custom font dependencies.

### Step 2: SQLite setup and seed data
- **AI generated:** CSV-to-JSON conversion script, seed data generator with 10 synthetic rows, `db.ts` with SQLite migrations (`PRAGMA user_version`), `JsonSeedSource.ts`, and root layout seed trigger.
- **Checked/changed:** Verified SQLite table creation for client and mock server, confirmed first-launch single transaction seeding and that subsequent launches do not re-seed.

### Step 3: Repositories, validation and save
- **AI generated:** `SqliteWorkOrderRepo`, `SqliteOutboxRepo`, `SqliteSettingsRepo`, `validation.ts`, `workOrderService.ts` transactional save, and urgency sorting query.
- **Checked/changed:** Verified transactional guarantee (work order + outbox in one SQLite transaction), checked mutation UUID generation via `expo-crypto`, confirmed validation stops invalid saves.

### Step 4: Mock server, sync service and tests
- **AI generated:** `SyncTransport` interface, `MockSyncTransport` with idempotency via `processed_mutations`, `SyncService` with concurrency lock and seq-ordered processing, and unit tests using in-memory fakes.
- **Checked/changed:** Verified double-tap sync idempotency, checked that offline mode blocks sync, verified fake transport and repo test suite passes in Jest.

### Step 5: Overview screen and hooks
- **AI generated:** `useWorkOrders`, `usePendingCount`, `useOffline`, `useSync` hooks, Overview screen with `SummaryCard`, `StatusBar` chart, `PriorityMenu`, `SegmentedControl`, and `OrderRow`.
- **Checked/changed:** Verified status and priority filter combinations, confirmed summary counts and overdue calculations, checked touch targets and floating button placement.

### Step 6: Detail screen
- **AI generated:** `app/order/[id].tsx` with header glyph, badges, `ProgressStepper`, grouped metadata card, reverse-chronological status history list, and sticky bottom bar.
- **Checked/changed:** Verified `Mark Completed` transactional mutation queuing, checked stepper glyphs and colors, confirmed not-found error handling.

### Step 7: Action screen with validation
- **AI generated:** `app/order/edit.tsx` for create and edit modes, field validation errors with red outlines, asset and technician selection modals, quick date presets, and offline notice.
- **Checked/changed:** Verified inline validation errors, tested keyboard handling, confirmed return to Overview updates pending counter and shows purple pending indicator.

### Step 8: Polish and states
- **AI generated:** Comprehensive Section 9 audit, added missing theme tokens (`cardPressed`, `disabled`, `modalOverlay`, `shadow`, `switchThumb`, `switchTrackOff`, `tileGlyph`, `badgeMediumBg`, `badgeLowBg`), eliminated 100% of hard-coded colors, increased `SegmentedControl` and date preset touch targets to >= 44px, added overview loading box, verified syncing spinner, "All changes synced" confirmation, and pending-to-synced transitions.
- **Checked/changed:** Verified safe area insets on mobile/tablet viewports, validated WCAG 4.5:1 contrast in light and dark modes, confirmed `npm test` (46 tests passing) and `npx tsc --noEmit` pass with zero errors.

