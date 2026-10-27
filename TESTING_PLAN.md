# Testing Plan — Pics.io Saved Searches

**Author:** Elgun Guluyev
**Feature:** Saved Searches (web app, `pics.io/search` → left sidebar "Searches" tab)
**Automation:** this repository — test IDs `SS-xx` below match the test titles in `tests/`.

---

## 1. What I'm testing and why

A **saved search** stores a search (text + filters + collection scope) under a name, so a team can reopen it later from the sidebar — like a "smart folder": *"all approved product photos"*, *"videos without transcripts"*. A new account already has ~45 team saved searches, so this is something Pics.io clearly expects people to use every day.

Why I chose it:

- **Quiet failures with real impact.** If a saved search opens with a lost filter, the user still sees a list of assets — just the wrong one — and may publish or share the wrong file. Bugs that don't look like bugs are the most dangerous ones.
- **It goes through the whole stack:** search bar and filters → save dialog → REST API → stored query → search engine results → sidebar tree.
- **Good for automation:** deterministic, state is easy to create and delete through the API, and it doesn't touch the auth/team-management areas the task asks to avoid.

## 2. What I learned while exploring (before writing any test)

I spent the first session exploring the feature manually with DevTools open. Main facts the plan and tests are built on:

| Area | Observation |
|---|---|
| UI | Save via the 🔍+ icon "Save this search" in the filters toolbar → **Create saved search** dialog (Name, *Save to* folder, *Share with my team*). Rename is inline in the tree, delete has a confirmation dialog. Hover icons: favorite, move to group, rename, delete. |
| API | `GET /savedSearches` (tree: `{ nodes: [...] }`), `POST /savedSearches` → 201, `PUT /savedSearches/:id/rename` → 200, `DELETE /savedSearches/:id` → 200. The query is stored in `data` (`text`, `collectionIds`, `tagId`, …). |
| Validation | Empty / spaces-only name → Ok button disabled (UI) and 400 (API). Duplicate in the same folder → 409 and a clear inline error. **Name max 50 chars on the server** (400 above that). |
| Security | HTML in the name is stripped by the server (`<img onerror>` is not stored, nothing executes). |
| Accessibility | Sidebar is a proper ARIA tree (`role="tree"/"treeitem"`, `aria-selected`) — good. Toolbar icon buttons (e.g. "Save this search") have **no accessible name**, only a hover tooltip. |

### Issues found during exploration

| ID | Severity | Summary |
|---|---|---|
| **BUG-01** | **Major** | **Save fails silently.** The name input accepts more than 50 characters; the server answers 400 and the dialog simply closes — no error, nothing saved. The same happens on any server error (simulated 4xx/5xx). The user believes the search was saved and loses it. *Expected:* keep the dialog open with an inline error (and ideally `maxlength=50` on the input). Automated as SS-10 / SS-12 with `test.fail()`, so the suite turns red when the bug is fixed and the annotation can be removed. |
| BUG-02 | Minor | Stripping HTML from the name leaves trailing whitespace (`"name "`), which is not trimmed. |
| A11Y-01 | Minor | Icon buttons in the search toolbar have no `aria-label` — not usable with a screen reader, and forces tests to use CSS selectors. |

## 3. Scope

**In scope:** create, open (apply), rename, delete, filter list, name validation, persistence, server-error handling, API contract, basic security (XSS), cross-browser smoke.

**Out of scope for this round:**
- Login, SSO, invites, roles (protected areas, per the task note) — login is only a precondition (`storageState`).
- Sharing with a second team member and permission differences — needs a second user; listed as follow-up.
- Search relevance/ranking quality of the search engine itself.

## 4. Test aspects and approach

| Aspect | What I check | How |
|---|---|---|
| **Functional** | Create from current query; opening restores the *same* query and the *same* result count; rename; delete; filter | Manual first, then Playwright UI tests |
| **Data integrity** | What is stored = what the user searched (`data.text`), rename doesn't change the query | API assertions inside UI tests |
| **UI / UX** | Success toast, item appears immediately, selected state, inline rename (Enter / Esc), confirm before delete, error messages | Manual + key states automated |
| **API & networking** | Status codes 201/200/400/409, response shape, UI behaviour on 5xx / timeout / offline, no duplicate requests on double click | Playwright `request` + `page.route()` mocks; DevTools / Postman manually |
| **Validation & edge cases** | Empty, spaces, 50 / 51 chars, duplicates, emoji / Cyrillic / `& " '`, query that returns 0 results, saved search pointing to a deleted collection or tag | Data-driven tests + exploratory |
| **Security** | XSS in name; another account's saved-search ID can't be read/deleted (IDOR); requests without session return 401 | API tests on my own trial account only |
| **Performance** | Time from click to results when opening a saved search; sidebar with 100+ saved searches | Playwright timings / Performance tab; load test of `GET /savedSearches` only with the team's permission |
| **Cross-browser / device** | Chrome, Firefox, Safari; narrow viewport (collapsed sidebar) | Playwright projects: full suite on Chromium, P1 smoke on Firefox + WebKit |
| **Accessibility** | Keyboard-only create/rename/delete, focus return after dialogs, labels | Manual + axe-core as a follow-up |

## 5. Prioritisation

Risk = user impact × likelihood. P1 must pass before every release.

| ID | Scenario | Priority | Automated |
|---|---|---|---|
| SS-01 | Create a saved search from the current query | P1 | ✅ UI + API check |
| SS-02 | Open saved search → same query and same results | P1 | ✅ |
| SS-03 | Saved search persists after reload | P1 | ✅ |
| SS-04 | Rename (and query unchanged) | P1 | ✅ |
| SS-05 | Delete after confirmation | P1 | ✅ |
| SS-06 | Cancel delete keeps the item | P2 | ✅ |
| SS-07 | Filter the saved-search list | P2 | ✅ |
| SS-08 | Empty / spaces-only name blocked | P2 | ✅ data-driven |
| SS-09 | Duplicate name → inline error | P2 | ✅ |
| SS-10 | Name > 50 chars → user sees an error (**BUG-01**) | P2 | ✅ expected-fail |
| SS-11 | Server error → no "ghost" item | P2 | ✅ mocked 500 |
| SS-12 | Server error → user sees an error (**BUG-01**) | P2 | ✅ expected-fail |
| SS-13 | API create/read/delete round trip | P1 | ✅ API |
| SS-14 | API rejects invalid names (400) | P2 | ✅ API |
| SS-15 | API rejects duplicates (409) | P2 | ✅ API |
| SS-16 | XSS payload in name not stored/executed | P2 | ✅ API + UI |
| SS-17 | Save to a sub-folder / personal vs team, "Share with my team" off | P2 | manual (next to automate) |
| SS-18 | Favorite and "move to group" | P3 | manual |
| SS-19 | Saved search with several filters (type + keyword + rating) restores all of them | P2 | manual (next to automate) |
| SS-20 | Saved search referencing a deleted collection / tag | P3 | exploratory |
| SS-21 | Two tabs: delete in one, open in the other | P3 | exploratory |
| SS-22 | 100+ saved searches: render time, scroll, filter | P3 | manual / perf job |
| SS-23 | Keyboard-only flow and screen reader labels | P3 | manual |
| SS-24 | IDOR: other account's saved-search ID | P2 | manual (needs 2nd account) |

## 6. What I automate and why

**Automated** — things that run on every deploy (the team ships several times a day) and give a clear signal:
- **P1 flows** — biggest user impact, stable to automate.
- **Validation** — same steps with many inputs → data-driven tests are cheap, manual repetition is not.
- **Server errors** — can't be reproduced by hand on demand; `page.route()` makes it a 2-line setup.
- **API contract** — fast, stable, and tells immediately whether a failure is backend or UI.

**Not automated (on purpose):**
- Visual/UX judgement and accessibility feel — a person does this better.
- One-off edge cases with heavy setup (deleted tags, concurrency) — exploratory sessions, automate only if a bug is found there.
- Performance with large libraries — needs a prepared dataset; belongs in a scheduled job, not the PR suite.

**Suite design:**
- Each test creates its own data (`autotest-<label>-<id>`) through the API and a fixture deletes everything with that prefix after **every** test — tests are independent and never touch real saved searches.
- Login once, reuse the session (`storageState`).
- Page Objects; locators by role / placeholder / test id first (`getByRole('treeitem')`, `data-testid="savedSearchRename"`), CSS only where the app has nothing better (documented in code).
- Web-first assertions only, no fixed sleeps.
- UI tests also check what the API stored — a green test means the data is really correct.
- Known bugs are `test.fail()` with an annotation instead of being skipped or deleted.

## 7. Tools

| Purpose | Tool |
|---|---|
| UI + API automation | Playwright + TypeScript |
| Test cases | QASE (IDs SS-xx linked to test titles) |
| API exploration | Chrome DevTools Network tab, Postman / Swagger |
| CI | GitHub Actions — smoke on every PR, full suite nightly |
| Reports | Playwright HTML report with trace, screenshot and video on failure |
| Bugs | Jira |
| **AI** | **Claude (Claude Code + Claude in Chrome)** — explored the live app with me: read the DOM for stable selectors, captured the saved-search API calls, probed validation limits, helped draft page objects and reviewed tests for weak assertions. Every suggestion was checked against the real app; final decisions on what is a bug and what to automate are mine. |

## 8. Metrics and benchmarks

| Metric | Target |
|---|---|
| P1 automation coverage | 100 % |
| Smoke pass rate on main | ≥ 98 % (lower = flaky tests to fix, not ignore) |
| Flaky rate | < 2 % of runs need a retry; flaky tests are quarantined with a ticket |
| Smoke duration | < 5 min |
| Open saved search → results visible | < 2 s (library ~1,000 assets) |
| `POST /savedSearches` | p95 < 500 ms |
| Escaped defects | 0 P1 bugs in saved searches found by users after release |

## 9. Communicating results

- **Every PR / deploy:** GitHub Actions shows pass/fail; on failure the HTML report with trace and video is attached, so a developer sees the exact step without asking.
- **Bugs:** Jira ticket with steps, expected vs. actual, environment, browser, video, and the API request/response — like BUG-01 above. Severity agreed with the PM.
- **Release:** short note in the release channel — what was tested, what is automated, known issues and risks, and a clear go / no-go.
- **Per sprint:** pass-rate and flaky-test trend, escaped defects — quality discussed with numbers.
