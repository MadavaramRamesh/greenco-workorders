# GreenCo Work Orders

An offline-first mobile app for plant technicians to view and update maintenance work orders (wind turbines, solar inverters, pumps). Built for the "Plant Work Orders & Maintenance Planner" case with React Native, Expo and SQLite.

[Overview](https://claude.ai/chat/screenshots/overview.png) · [Detail](https://claude.ai/chat/screenshots/detail.png)

## What it does

- **Overview:** work orders sorted by urgency, status and priority filters, a status summary bar, the offline switch, the pending count and Sync Now.
- **Detail:** work order information and its status history.
- **Action:** create or edit a work order with validation (title of at least 3 characters, asset, priority, status, valid due date).
- **Offline:** every save is written to SQLite and queued in an outbox. Sync Now sends the queue to a simulated server. Syncing twice never creates duplicates.
- **Theme:** light by default (easier to read outdoors). Dark follows the phone setting.

## Run it

You need Node 18 or newer, and either the Expo Go app on a phone or an Android emulator or iOS simulator.

```bash
npm install
npx expo start
npm test
```

After `npx expo start`, press `a` for the Android emulator, `i` for the iOS simulator, or scan the QR code with Expo Go (the phone and computer must be on the same Wi-Fi).

The first launch loads 14 work orders: the 4 from `data/work_orders.csv` plus 10 synthetic ones I added.

**Reset the demo data:** clear the app's storage and relaunch.
- **Android emulator:** `adb shell pm clear host.exp.exponent`
- **Android phone:** Settings, Apps, Expo Go, Storage, Clear data
- **iOS simulator:** delete Expo Go and reinstall it
- A `resetDatabase()` helper also exists in `src/data/db.ts`.

## Offline demo checklist

1. Start the app. Overview shows the 14 demo orders.
2. Open an order (Detail), then Edit or New Order (Action).
3. Turn on Offline (top right). Edit or create an order and save. The pending count shows 1 and the order has a Pending icon.
4. Fully close the app and reopen it. The change is still there and still pending.
5. Turn Offline off and tap Sync Now twice. Pending goes to 0, the order shows as synced, and there is no duplicate.
6. Save with an empty title to see the validation error. Run `npm test`.

## Tests

Run `npm test`. Result: 5 test suites passed, 54 tests passed. The tests use in-memory fakes for the repositories and the sync transport, so they run without a device or a real SQLite database.

The required test from the case: (a) two `syncNow()` calls fired together, then one more, produce exactly one server effect and an empty outbox in `__tests__/sync.test.ts`.

| Suite | Tests | What is covered |
| --- | --- | --- |
| `sync.test.ts` | 7 | Sync twice gives one server effect. The same mutation_id twice returns duplicate. A duplicate response clears the outbox row. Nothing is sent while offline. A rejected change or network error keeps the outbox row and stops the queue. An order stays pending until all its changes are synced. Empty title rejected. |
| `validation.test.ts` | 8 | Empty, whitespace-only and too-short title, missing asset, invalid priority, invalid status, invalid due date, and a valid order passing. |
| `action.test.ts` | 19 | 7 shared sync tests, plus validation, a failed save writing nothing, create (revision 1, pending, one outbox change), edit (revision +1, one outbox change) and helpers. |
| `detail.test.ts` | 14 | 7 shared sync tests, plus Mark Completed (one outbox change and one history entry), overdue days, completed orders never overdue, stepper progress, date formatting and asset labels. |
| `overview.test.ts` | 6 | Urgency ordering (overdue first, then priority), overdue detection, asset icon mapping, data-change notifications and the empty-state text. |

The 7 sync tests also run inside `action.test.ts` and `detail.test.ts`, so they appear in each of those suites.

### Case requirements and where they are tested

| Case requirement | Test |
| --- | --- |
| Sync Now twice causes no duplicate effect | `sync.test.ts`, test (a) |
| Unique mutation IDs, repeats ignored | `sync.test.ts`, test (b) |
| Offline: nothing is sent | `sync.test.ts`, test (c) |
| Create or update queues exactly one change | `action.test.ts`, create and edit tests |
| Validation error path | `validation.test.ts` |

## Architecture

```
Screens (Overview, Detail, Action)
   ↓
Hooks (useWorkOrders, usePendingCount, useOffline, useSync)
   ↓
Services (workOrderService, syncService)
   ↓                                       ↓
SQLite repositories                     SyncTransport (interface)
(work_orders, status_history,              ↓
 outbox, settings)                      MockSyncTransport
                                        (server_orders, processed_mutations)
```

- **UI:** three screens plus small shared components. Colors come from one theme file.
- **State:** React hooks that read from SQLite. A small event emitter refreshes them after a write. No global store.
- **Persistence:** expo-sqlite. A save writes the work order, any status history and one outbox row in a single transaction.
- **Mock sync:** syncService talks only to the `SyncTransport` interface. The mock server is one implementation of it.
- **No duplicates:** each queued change has a UUID `mutation_id`. The outbox is sent in order (`seq`). The mock server ignores any `mutation_id` it has already processed. An `isSyncing` lock stops a double tap.
- **Swap points:** `WorkOrderSource` (JSON seed today) and `SyncTransport` (mock today) are the two places that change with a real backend.

## Technology tradeoffs

- **Expo managed workflow instead of bare React Native or native Android**
  - **Gain:** fast setup, runs in Expo Go, no native build tools.
  - **Cost:** limited background sync and fewer native APIs. For production I would move to a development build to get background sync.
- **React hooks over SQLite instead of a global store like Redux**
  - **Gain:** less code, easy to follow.
  - **Cost:** needs a manual refresh mechanism after writes. Here a small event emitter refreshes the hooks.

## What would change for a real multi-user backend

- Authentication, with tokens sent on every request.
- An `HttpSyncTransport` (REST or GraphQL) replacing the mock transport.
- Pull sync, so devices receive other people's changes.
- Server-side conflict handling using each record's revision and the `base_revision` sent with every change.
- A real server-side store for processed mutation IDs, and background sync.

## AI note

I used two AI tools: a chat assistant (Claude) to analyse the case and plan the work, and Google Antigravity (Gemini) to write the code one step at a time. The step-by-step plan, the decisions and tradeoffs, and what I checked at each step are in [AI_NOTES.md](./AI_NOTES.md).

In short:
- **Planning and design:** I worked out the architecture, data model and sync design in the planning chat, reviewed each decision, and told the coding agent to follow it.
- **AI wrote:** the boilerplate, screen layouts, the sample data rows and most of the tests.
- **I checked:** that a save creates exactly one outbox row and rolls back on failure, that syncing twice leaves one server effect, and that data survives a full app restart. I also ran the demo above on a device.
- **I changed or rejected:** I rejected deduplicating sync mutations by work order ID (it must use the mutation UUID so an order can be edited repeatedly), changed outbox ordering from timestamps to an auto-increment integer `seq` to avoid race conditions, and used in-memory repo fakes so tests run fast without native SQLite in Jest.
