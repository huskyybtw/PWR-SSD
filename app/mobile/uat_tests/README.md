# UAT test sessions

Recordings of the usability tests from *Class 6 – Research Scenarios* (T1–T4).
Each folder in `sessions/` is one saved session.

## Running a session

1. Start the app in a **development build** (Expo Go / `npm run android`). The
   grey **UAT** button (bottom-left, above the tab bar) only exists in dev builds.
2. Optional: turn on visible taps for the video – `npm run uat:taps -- on`
   (or enable *Show touches* in Android's screen recorder).
3. Start Android's screen recorder (Quick Settings → *Screen record*).
4. Tap **UAT** – recording starts immediately; the button turns red and shows the time.
5. The participant does the tasks. Taps, screens, dialogs and app events are logged.
6. Tap the red **Stop** button, then stop the Android screen recording.
7. Enter a session name (e.g. `P1 T1-T4`) and tap **Save session**, or
   **Discard** to throw it away.
   The first save asks for a folder – choose **Download**.
8. On the computer, with the phone connected over USB / the emulator running:

   ```
   cd app/mobile
   npm run uat:pull
   ```

   Sessions are copied from `Download/uat_tests/sessions/` on the phone into
   `uat_tests/sessions/<name>/` here, together with the screen recordings that
   were finished during the session.

   - `npm run uat:pull -- --delete` also removes the copied files from the phone.
   - `npm run uat:pull -- --force` copies a session again.
   - `npm run uat:taps -- off` turns visible taps off after the tests.

## Files in a session folder

| File | Content |
|---|---|
| `summary.md` | Duration, screen timeline (time on each screen), taps per screen, modals, alerts with the chosen button, app events, errors, links to the videos |
| `events.csv` | One row per event: `t_ms, time, type, screen, x, y, detail` – for spreadsheets |
| `session.json` | Full log: session meta (name, start/end, device) + all events |
| `video_N.mp4` | Screen recording(s) matched by time |
| `videos.json` | Where each video came from and when it finished |

### Event types

| Type | Meaning |
|---|---|
| `tap`, `long_press`, `swipe` | A touch with screen position (`x`, `y`), the screen and the open modal |
| `screen` | The user moved to another screen (route) |
| `modal_open`, `modal_close` | A sheet/dialog of the app opened or closed (e.g. `import`, `add_transaction`, `new_budget`) |
| `alert_shown`, `alert_button` | A system dialog (e.g. *Import complete*, errors) and the button pressed |
| `app_event` | Result of an action: `transaction_added`, `import_statement` (imported/skipped), `import_receipt`, `category_changed`, `budget_created`, `goal_created`, `goal_contribution`, `ai_retry`, … with `ok`, duration and error |
| `session_start`, `session_end` | Start and stop of the recording |

Typed text is not logged – only which control was tapped.

## Mapping to the evaluation sheets

- **Time per step / time on task** – `t_ms` of the first and last event of a step
  (compare with the video).
- **Taps / path efficiency** – count `tap` rows between two steps and divide by
  the number of taps on the GOMS method.
- **Errors** – `alert_shown` with failure titles, `app_event` with `ok=false`,
  going back to a previous screen in the screen timeline.
- **Alert noticed (T2)** – time from the moderator's expense to the first tap on
  the Dashboard alert.

Videos are large; consider Git LFS before committing many sessions.
