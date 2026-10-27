# Pics.io — Saved Searches test suite

Playwright + TypeScript tests for the **Saved Searches** feature of [Pics.io](https://pics.io).
The testing plan (approach, priorities, metrics and the bugs I found) is in **[TESTING_PLAN.md](TESTING_PLAN.md)**.

## What I chose to test and why

Saved searches are "smart folders" a team reopens every day. When they break, they usually break **quietly**: the user still gets a list of assets, just the wrong one, or thinks a search was saved when it wasn't. So the suite focuses on one question: **is what the user saved exactly what they get back?**

| Spec | Covers | Plan IDs |
|---|---|---|
| `tests/ui/create-and-open.spec.ts` | Create from current query, open restores the same query + results, persistence | SS-01..03 |
| `tests/ui/manage.spec.ts` | Rename, delete with confirmation, cancel delete, filter the list | SS-04..07 |
| `tests/ui/validation.spec.ts` | Empty / spaces name, duplicate name, name over the 50-char limit | SS-08..10 |
| `tests/ui/error-handling.spec.ts` | Mocked 500 on save: no ghost item, user should see an error | SS-11..12 |
| `tests/api/saved-searches.api.spec.ts` | API round trip, 400 / 409 rules, XSS in name | SS-13..16 |

**Deliberately not automated:** visual/UX judgement, concurrency and deleted-tag edge cases, performance with large libraries. Reasons are in the plan (section 6).

### Known bug kept visible in the suite

**BUG-01: saving fails silently.** A name longer than 50 characters, or any server error, closes the dialog with no message and nothing gets saved. SS-10 and SS-12 describe the *expected* behaviour and are marked `test.fail()` with an annotation. They show as passing ("expected to fail") until the bug is fixed. After the fix Playwright reports them as unexpectedly passing, which is the signal to remove `test.fail()`.

## How the suite is built

```
src/
  api/SavedSearchesApi.ts      # GET/POST/PUT/DELETE /savedSearches: setup, verification, cleanup
  pages/SearchPage.ts          # search bar, results counter, "Save this search" button
  pages/SaveSearchDialog.ts    # "Create saved search" modal
  pages/SavedSearchesPanel.ts  # sidebar tree: open, rename, delete, filter
  fixtures/test.ts             # page objects + auto cleanup + blocks the Intercom chat widget
tests/
  auth.setup.ts                # logs in once, saves the session (.auth/user.json)
  ui/*.spec.ts
  api/*.spec.ts
```

- **Independent tests:** every test creates its own data (`autotest-<label>-<id>`), mostly through the API, and a fixture deletes everything with the `autotest-` prefix after **every** test, including failed ones. Real saved searches are never touched.
- **Selectors:** role/placeholder/test id first (`getByRole('treeitem', { name })`, `getByTestId('savedSearchRename')`). CSS is used only where the app offers nothing better, with a comment saying why.
- **Assertions:** web-first only, no `waitForTimeout`. UI tests also check the network response and what the API stored, so a green test means the data is really correct.
- **Cross-browser:** the full suite runs on Chromium; `@smoke` UI tests also run on Firefox and WebKit.

## Run it locally

Requirements: Node.js 18+ and a Pics.io account (the free trial works).

```bash
npm install
npx playwright install          # downloads the browsers
cp .env.example .env            # then fill in PICSIO_EMAIL and PICSIO_PASSWORD
```

If you signed up with **Google / Microsoft** (no password), skip the `.env` credentials and log in once by hand:

```bash
npm run auth:manual             # a browser opens: log in, the session is saved to .auth/user.json
```

Run the tests:

```bash
npm test                        # everything (Chromium + Firefox/WebKit smoke)
npm run test:chromium           # full suite, Chromium only
npm run test:smoke              # @smoke tests only
npm run test:headed             # watch it run
npm run report                  # open the HTML report (trace, video, screenshots on failure)
npm run typecheck
```

The tests search for `guide`, which matches the onboarding documents every new trial account gets. If your library is different, set `SEARCH_TEXT=<word>` in `.env`.

## CI

`.github/workflows/playwright.yml` runs the suite on push / PR and nightly (smoke on PRs, full suite on main and nightly). Add `PICSIO_EMAIL` and `PICSIO_PASSWORD` as repository secrets. The HTML report is uploaded as an artifact.

## AI tools used

- **Claude (Claude Code + Claude in Chrome):** explored the live app together with me. It read the DOM to find stable hooks (the ARIA tree, `data-testid="savedSearchRename"`), captured the `/savedSearches` API calls in the Network tab, and probed the validation rules directly against the API (50-char limit, 409 on duplicates, HTML stripping). Simulating a failed save in the browser is how **BUG-01** was found. It also drafted the page objects and reviewed the tests for weak assertions, for example making sure the UI tests also check what the API stored.
- Everything was checked against the real app. The decisions about what is a bug, what to automate and what to leave manual are mine.
