# GreenCo Work Orders: AI Notes

How I used AI on this project, what it did, and what I decided and checked myself.

## Tools

- **Claude (chat):** analysing the case, planning, UI mockups, and drafting the step-by-step prompts.
- **Google Antigravity (Gemini):** writing the code, one step per task in Planning mode. I read each implementation plan before approving it.

## 1. Approach

1. **Analysed the case first.** Required: three screens, an offline queue, a simulated sync with no duplicates, a persistent datastore and one test. Excluded: real backend, scheduler, attachments, multi-user merge. So I built no backend and no GraphQL.
2. **Designed before coding.** Outbox table for queued changes, a unique `mutation_id` per change so the server can ignore repeats, outbox ordered by an auto-increment `seq` (not timestamps), and two interfaces (`WorkOrderSource`, `SyncTransport`) so the data source and the server can be swapped.
3. **Chose tradeoffs.** Expo managed workflow over bare React Native, and React hooks over SQLite instead of a global store. Both are explained in the README.
4. **Planned 9 steps.** Data layer and sync logic came before any screen, because they are the core of the case.
5. **Checked setup.** Confirmed against current Expo documentation for Expo SDK 57, ensuring usage of `expo-sqlite` modern async API (`openDatabaseAsync`, `withTransactionAsync`, `runAsync`, `getAllAsync`) and Expo Router v57 stack navigation rather than deprecated legacy APIs.

## 2. Decisions I made or changed

- **UI direction:** I rejected several designs (dark editorial, Material-style) and chose a clean iOS style. Light theme is the default because it is easier to read in sunlight at remote sites. Dark follows the phone setting.
- **History scope:** the case asks for status history, so history records status changes only. I considered tracking every field and decided it was outside the one-day scope.

- **Idempotency key enforcement (rejected plan):** The AI initially considered deduplicating sync mutations on the server using `wo_id`. I rejected this because technicians legitimately edit the same order multiple times; idempotency must strictly key off the UUID `mutation_id`.
- **Outbox ordering (plan changed):** The AI initially proposed sorting outbox entries by `created_at` timestamp. I changed this to an auto-increment integer `seq` to prevent clock skew or sub-millisecond timestamp collision bugs during fast offline edits.
- **In-memory test fakes:** When the AI proposed mocking the native SQLite driver in Jest, I insisted on creating pure TypeScript in-memory repository fakes (`InMemoryWorkOrderRepo`, `InMemoryOutboxRepo`, `FakeSyncTransport`) against the domain interfaces. This made the 54 unit tests run in ~1s with zero flakiness.

## 3. Step log

### Step 1: Structure, theme and navigation
- **AI generated:** folder structure, `types.ts`, `theme.ts` with light and dark tokens, placeholder stack screens.
- **I checked:** navigation between the three screens and light/dark switching on a device.

### Step 2: SQLite setup and seed data
- **AI generated:** CSV-to-JSON script, 10 synthetic rows, `db.ts` with `PRAGMA user_version` migrations, `JsonSeedSource.ts`, seed on first launch.
- **I checked:** the tables are created, 14 orders load, and a second launch does not seed again.

### Step 3: Repositories, validation and save
- **AI generated:** the SQLite repositories, `validation.ts`, the transactional `saveWorkOrder`, and the urgency sort query.
- **I checked:** one save adds exactly one outbox row and raises the revision by 1, an invalid save writes nothing, and a failure inside the transaction saves nothing.

### Step 4: Mock server, sync service and tests
- **AI generated:** `SyncTransport`, `MockSyncTransport` (duplicate check on `mutation_id`), `SyncService` with the `isSyncing` lock and `seq` ordering, and unit tests with in-memory fakes.
- **I checked:** syncing twice leaves one server effect, offline blocks sync, and `npm test` passes.

### Step 5: Overview screen and hooks
- **AI generated:** the four hooks, `SummaryCard`, `StatusBar`, `PriorityMenu`, `SegmentedControl`, `OrderRow`.
- **I checked:** status and priority filter combinations, the summary and overdue counts, and touch targets.

### Step 6: Detail screen
- **AI generated:** the Detail screen with badges, progress stepper, grouped details, status history and the bottom bar.
- **I checked:** Mark Completed queues one change and adds a history entry, and a missing id shows a not-found state.

### Step 7: Action screen with validation
- **AI generated:** create and edit form, inline errors with red outlines, asset and technician pickers, quick date presets, offline notice.
- **I checked:** the empty-title error, keyboard behavior, and that saving returns to Overview with the Pending icon and updated count.

### Step 8: Polish and states
- **AI generated:** replaced hard-coded colors with theme tokens, raised small touch targets to 44px, added loading, syncing and All changes synced states.
- **I checked:** light and dark on a device, `npm test` (54 tests passing) and `npx tsc --noEmit` both pass.

### Step 9: Final tests, README and demo prep
- **AI generated:** validation test suite in `__tests__/validation.test.ts`, concise README structure matching the prompt specifications.
- **I checked:** verified all 5 test suites (54 tests) pass, confirmed the 3-minute offline demo script steps, and verified that no runtime app code was changed.

## 4. Verification

I ran the full offline demo on a device: turn Offline on, edit an order, see the pending count of 1, fully close and reopen the app, turn Offline off, tap Sync Now twice, and confirm pending is 0 with no duplicate.

## 4. Verification

I ran the full offline demo on a device: turn Offline on, edit an order, see the pending count of 1, fully close and reopen the app, turn Offline off, tap Sync Now twice, and confirm pending is 0 with no duplicate.

