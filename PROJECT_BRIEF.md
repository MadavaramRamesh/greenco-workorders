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