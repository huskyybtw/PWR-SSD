# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An Expo (SDK 54) / React Native personal-finance app ("Budget Analysis"). This folder (`app/mobile`) is the whole app; run all commands from here. The UI is in English; the target data is Polish (PLN, Polish banks/shops like Biedronka, PKO BP).

`uat_tests/` holds the usability-test tooling docs (`uat_tests/README.md`); pulled sessions go to `uat_tests/sessions/` (gitignored).

## Commands

```bash
npm run android            # expo start --android (Expo Go on the emulator)
npx expo start -c          # restart Metro with a clean cache (needed after dependency changes)
npx tsc --noEmit           # type-check (there is no lint script)
npm test                   # jest (jest-expo preset)
npx jest shared/duplicates.test.ts            # one test file
npx jest -t "skips a re-imported statement"   # one test by name
npm run db:generate        # drizzle-kit: generate a migration from shared/schema.ts
npm run push:test-files    # push assets/images/test-data (receipt jpg, statement pdf) to the emulator
python scripts/generate-icons.py  # regenerate icon / adaptive-icon / splash-icon / favicon (needs Pillow)
npm run uat:pull           # copy UAT sessions (+ screen recordings) from the phone into uat_tests/sessions
npm run uat:taps -- on|off # Android "show taps"
```

- Install/upgrade Expo packages with `npx expo install <pkg>` (`npx expo install --check` to verify). Versions must match SDK 54; mismatched native modules break at runtime in Expo Go.
- `.npmrc` has `legacy-peer-deps=true`.
- `EXPO_PUBLIC_GEMINI_API_KEY` in `.env` (see `.env.example`); it is bundled into the client.
- Development is on Windows; the adb helper scripts find adb via PATH, `ANDROID_HOME` or `%LOCALAPPDATA%\Android\Sdk`.

## Architecture

Data flows **screen → `useFinance()` → service hook → repository → SQLite**.

- **Routes** (expo-router, `app/`): tabs `index` (Dashboard), `transactions`, `budgets` (shown as "Planning": budgets + savings goals via `components/budgets-panel.tsx` / `goals-panel.tsx`), `reports`. Non-route modules must not live in `app/` (expo-router treats every file there as a route).
- **Startup** (`app/_layout.tsx`): `bootstrapApp()` (`shared/bootstrap.ts`) runs migrations, seeds the default user/categories and normalizes income categories **before** `FinanceProvider` mounts. Services read the DB in their own effects, so nothing may render the provider before bootstrap finishes.
- **State** (`shared/finance-context.tsx`): one context (`@nkzw/create-context-hook`) composes the service hooks in `services/*-service.ts` and exposes actions to screens. Goal auto-update (income adds to / expenses subtract from every goal) and budget alerts are orchestrated here via callbacks passed into `useTransactionsService`.
- **Services** keep local React state mirrored by a ref (`txRef`, `goalsRef`) so async callbacks never act on stale state, and write to the DB *before* updating state.
- **Repositories** (`repositories/`) use drizzle-orm over `expo-sqlite` (`shared/client.ts`, schema in `shared/schema.ts`).

### Data model rules worth knowing

- `transactions.amount` is stored **signed** (negative = expense); the `Transaction` type exposes a positive `amount` + `type`. The category is stored by id; unknown names fall back to "Uncategorized".
- `source` ("manual"/"import") is derived from the `transaction_logs` row (`manual-transactions` vs `imported-transactions`).
- Income always has the category `"Income"` (`INCOME_CATEGORY`, `expenseCategories()` in `repositories/categories-repository.ts`); expenses can never use it. Enforced in the service and fixed on startup.
- Duplicate detection for imports is in `shared/duplicates.ts`: against earlier *imports* amount+date+type is enough (Gemini may word rows differently); against manual entries the normalized description must match too; rows within one document are never deduplicated.

### Migrations (drizzle, `drizzle/`)

- After changing `shared/schema.ts` run `npm run db:generate`; `drizzle/migrations.js` is regenerated and the `.sql` files are inlined by babel (`inline-import`).
- SQLite cannot `ALTER TABLE ADD` a `NOT NULL` column without a constant default (it fails as soon as the table has rows) or with `DEFAULT CURRENT_TIMESTAMP` – make such columns nullable and set them in code.
- The expo migrator applies a migration only if its `when` in `drizzle/meta/_journal.json` is newer than the last applied one; never rewrite the timestamp of a migration that may already be applied on a device.

### AI import (receipts and bank statements)

- All Gemini calls go through `services/ai/gemini.ts` (`generateJsonWithRetry`, model `GEMINI_MODEL`). The free tier often returns 503/429: requests are retried up to `MAX_RETRIES` with exponential backoff and a per-attempt timeout; the user only sees an error after the last attempt, and progress is reported via `onProgress`.
- `services/transactions/ocr-reader.ts` (receipt image) and `statement-analyzer.ts` (PDF/image statement) send the file as base64 with a JSON response schema; prompts require descriptions copied verbatim (not translated) and offer the expense categories as an enum. Output is validated/normalized in `ai-shared.ts` (rows without amount/date are dropped).
- User-facing texts do not mention "Gemini".

### Navigation with filters

Screens accept deep-link params to pre-filter: `/transactions?type=&category=&from=&to=&ts=`, `/reports?from=&to=&label=&ts=`, `/budgets?tab=budgets|goals`. `ts` (e.g. `Date.now()`) forces the params to be re-applied on repeated navigation. Filtering logic lives in `shared/transaction-filters.ts`; the Transactions screen defaults to the current month. The Dashboard shows the current month, or the month of the most recent transaction when the current one is empty.

### UAT recorder (dev builds only)

`components/uat/uat-overlay.tsx` (UAT button, `__DEV__` only) + `shared/uat/recorder.ts` log taps, screens, modals, native alerts and app events during usability tests; sessions are saved via the Storage Access Framework to `Download/uat_tests/sessions/<name>/` on the phone and copied with `npm run uat:pull`. To keep it complete:

- Use `AppModal` (`components/app-modal.tsx`, with a `name`) instead of React Native's `Modal` – modals render outside the root touch capture.
- New user actions exposed by `finance-context.tsx` should be wrapped with `tracked(name, fn, …)` (`shared/uat/tracked.ts`).

## UI conventions

- Styling is NativeWind (`className`) with custom tokens from `tailwind.config.js` (`appBackground`, `appSurface`, `appText`, `appPrimary`, `appDanger`, …) and `constants/colors.ts` for JS colors. Tailwind only scans `app/`, `components/`, `utils/` and root files – `className`s in `shared/` are not generated.
- Shared visual components: `IncomeExpenseCards`, `TransactionRow`, `CategoryIcon`/`categoryColor` (per-category icon + color), `CategoryBreakdown` (donut or histogram), `DailyTrendChart`. Reuse them so screens stay consistent.
- Money: `formatCurrency()` (PLN, `1 234,56 zł`, manual formatting – Hermes `Intl` is unreliable). Dates are `YYYY-MM-DD` strings; use `parseLocalDate` / `toIsoDate` / `monthKey` from `shared/utils.ts` instead of `new Date(str)` or `toISOString().split("T")` (UTC shift).
- Touch targets must be at least 44pt (`h-11`, `w-11 h-11` for icon buttons).
