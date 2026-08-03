# Phase 0 + Phase 1 — Foundations and Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the test infrastructure and three shared helpers that the rest of the change set depends on, then land every content and label change that needs no schema work.

**Architecture:** Two test runners are introduced first (pytest for the FastAPI backend, Vitest for the Next.js frontend) because no tests exist anywhere in this repo today. Three shared frontend helpers follow — a media-URL resolver, a multi-term search matcher, and a labelled edit button — each written test-first. Phase 1 then applies content edits that consume nothing but existing code.

**Tech Stack:** FastAPI · SQLAlchemy (async) · SQLite/Postgres · pytest + pytest-asyncio · Next.js 16.2.9 (App Router) · React 19.2.4 · TypeScript · Tailwind CSS v4 · Vitest + React Testing Library

---

## Global Constraints

- **Next.js is 16.2.9 and React is 19.2.4.** `frontend/AGENTS.md` states: *"This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."* Consult those docs before using any Next.js or React API from memory.
- **Only these accounts may log in:** `UserRole.ADMIN`, `UserRole.SUPER_ADMIN`, `UserRole.VOLUNTEER`, or any user with a non-null `custom_role_id`. Enforced at `backend/app/routers/auth.py:168` and `:253`. No task may weaken this.
- **Ordinary members never log in.** Any feature that needs to know whether someone is a member must derive it from data (a directory record), never from a session.
- **Schema changes** follow the existing convention: an Alembic revision **plus** a best-effort `ALTER TABLE` in the startup block at `backend/app/main.py:55-80`. Phase 0/1 introduce no schema changes.
- **Run the backend with `python run.py`**, never bare `uvicorn` — `run.py` binds `0.0.0.0`. See `README.md`.
- **Commit after every task.** Never use `--no-verify`.
- Spec: `docs/superpowers/specs/2026-08-03-portal-changes-design.md`

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `backend/tests/conftest.py` | pytest fixtures: isolated in-memory test DB, async session, HTTP client |
| `backend/tests/test_masking.py` | Tests for phone masking (used by Sweep B in the next plan) |
| `backend/tests/test_harness.py` | Canary tests proving both DB dependency overrides are in place |
| `frontend/vitest.config.ts` | Vitest + React plugin + jsdom environment |
| `frontend/vitest.setup.ts` | Registers `@testing-library/jest-dom` matchers |
| `frontend/src/utils/media.ts` | `mediaUrl()` — one rule for resolving stored media paths |
| `frontend/src/utils/media.test.ts` | Tests for `mediaUrl()` |
| `frontend/src/utils/search.ts` | `matchesSearch()` — multi-term, multi-field matcher |
| `frontend/src/utils/search.test.ts` | Tests for `matchesSearch()` |
| `frontend/src/components/ui/EditButton.tsx` | Labelled edit button replacing bare pencil icons |
| `frontend/src/components/ui/EditButton.test.tsx` | Tests for `EditButton` |

**Modified**

| File | Change |
|---|---|
| `frontend/package.json` | Add Vitest toolchain + `test` scripts |
| `frontend/src/components/layout/Navbar.tsx` | Remove "Register a household" (#1) |
| `frontend/src/components/layout/Footer.tsx` | Remove "Register a household" (#1) |
| `frontend/src/components/home/CovenantHero.tsx` | Remove "Register as Member" (D9) |
| `frontend/src/app/(auth)/login/page.tsx` | Remove "Register here" (D9) |
| `frontend/src/app/(public)/page.tsx` | Remove `<PortalIndex />` (#2) |
| `frontend/src/app/(public)/about/page.tsx` | Real leaders from the roster (#24) |
| `frontend/src/app/(public)/blog/page.tsx` | Enlarge filter and write-blog controls (#17) |
| `frontend/src/app/(public)/members/page.tsx` | Rename + reposition apply button (#16) |

**Deleted**

| File | Reason |
|---|---|
| `frontend/src/components/home/PortalIndex.tsx` | Whole section removed (#2) |
| `frontend/src/app/(auth)/register/page.tsx` | `/register` retired (D9) |

---

## Task 1: Backend test harness

Nothing in this repo is tested. This task creates the pytest scaffolding every later backend task needs, and proves it works by testing one real function.

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_masking.py`
- Create: `backend/tests/test_harness.py`
- Create: `backend/pytest.ini`

**Interfaces:**
- Consumes: nothing
- Produces: pytest fixtures `db_session` (an `AsyncSession` on a fresh in-memory SQLite DB) and `client` (an `httpx.AsyncClient` bound to the FastAPI app, with **both** DB dependencies overridden). Later backend tasks import these by fixture name only.

- [ ] **Step 1: Create the pytest configuration**

Create `backend/pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

`asyncio_mode = auto` means async test functions run without needing an `@pytest.mark.asyncio` decorator on each one.

- [ ] **Step 2: Create the test package marker**

Create `backend/tests/__init__.py` as an empty file.

- [ ] **Step 3: Write the fixtures**

Create `backend/tests/conftest.py`:

```python
"""Shared pytest fixtures.

Every test gets its own in-memory SQLite database, created and dropped inside
the test. Tests therefore never touch test.db and never see each other's rows.
"""

import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db_session
from app.dependencies import get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """One event loop for the whole session, so the engine is not rebound."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """A session on a fresh in-memory database.

    StaticPool keeps every connection pointed at the same in-memory DB —
    without it, each connection would get its own blank database.
    """
    from sqlalchemy.pool import StaticPool

    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """An HTTP client whose requests hit the test database.

    BOTH database dependencies must be overridden. This codebase has two, and
    which one a route uses depends on the router:

        get_db          (app.dependencies) — admin, auth, blog, bookings,
                        dashboard, donations, events, passes, receipts, role,
                        vouchers
        get_db_session  (app.database)     — chat, family, membership,
                        special_events

    Overriding only one leaves the other group of routes talking to the real
    test.db, which fails silently: the tests pass, against the wrong database.
    membership.py — the member directory — is in the second group.
    """

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_db_session] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

- [ ] **Step 4: Write a failing test against a real function**

`mask_phone_number` currently returns the last **3** digits. Sweep B (next plan) changes it to 4. Write the test for today's behaviour so the harness is proven now and the change is caught later.

Create `backend/tests/test_masking.py`:

```python
"""Tests for phone-number masking in the member directory."""

from app.routers.membership import mask_phone_number


def test_mask_returns_none_for_empty_input():
    assert mask_phone_number(None) is None
    assert mask_phone_number("") is None


def test_mask_hides_all_but_the_visible_tail():
    masked = mask_phone_number("9876543210")
    assert masked.endswith("210")
    assert masked.startswith("X")
    assert len(masked) == len("9876543210")


def test_mask_leaves_very_short_numbers_alone():
    assert mask_phone_number("12") == "12"


def test_mask_strips_surrounding_whitespace():
    assert mask_phone_number("  9876543210  ") == mask_phone_number("9876543210")
```

- [ ] **Step 5: Write the database-isolation canary**

If a dependency override is missed, tests still pass — against the real
`test.db`. This test fails loudly instead. It hits a `get_db_session` route
(`membership`) and a `get_db` route (`events`); on the empty test database both
must return nothing.

Create `backend/tests/test_harness.py`:

```python
"""Proves the test database is actually isolated from test.db.

Both DB dependencies must be overridden — see the docstring on the `client`
fixture. Without both, these routes read the developer's real database and
every later test silently asserts against the wrong data.
"""

from httpx import AsyncClient


async def test_membership_route_sees_the_empty_test_database(client: AsyncClient):
    """membership.py uses get_db_session."""
    response = await client.get("/api/v1/membership/members")
    assert response.status_code == 200
    assert response.json() == [], (
        "Expected no members in the fresh test database. Non-empty means the "
        "get_db_session override is missing and this hit the real test.db."
    )


async def test_events_route_sees_the_empty_test_database(client: AsyncClient):
    """events.py uses get_db."""
    response = await client.get("/api/v1/events")
    assert response.status_code == 200
    assert response.json() == [], (
        "Expected no events in the fresh test database. Non-empty means the "
        "get_db override is missing and this hit the real test.db."
    )
```

If a route path differs, confirm the prefix with
`grep -n 'prefix=' backend/app/main.py` and correct the URL — do **not** delete
the test.

- [ ] **Step 6: Run the tests and verify they pass**

```bash
cd backend
python -m pytest tests/ -v
```

Expected: 6 passed. If `ModuleNotFoundError: No module named 'app'`, run pytest from the `backend/` directory — `pytest.ini` sets `testpaths` relative to it.

If a canary test returns real data, the corresponding override is missing from `conftest.py`. Fix it before continuing; every later backend test depends on this.

- [ ] **Step 7: Prove the harness catches a real failure**

Temporarily change `test_mask_hides_all_but_the_visible_tail` to `assert masked.endswith("9999")`, run again, confirm it FAILS, then change it back and confirm it passes. A harness that cannot fail is not a harness.

- [ ] **Step 8: Commit**

```bash
git add backend/tests backend/pytest.ini
git commit -m "test: add pytest harness with isolated in-memory database

No tests existed in this repo. Adds session and HTTP client fixtures on a
fresh in-memory SQLite database per test, plus masking tests that pin the
current last-3-digits behaviour before Sweep B changes it to last-4.

Both get_db and get_db_session are overridden — this codebase uses two DB
dependencies split across routers, and overriding one leaves the other
group reading the real test.db. Canary tests in test_harness.py fail loudly
if either override goes missing."
```

---

## Task 2: Frontend test harness

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` (single run) and `npm run test:watch`. Test files are `*.test.ts` / `*.test.tsx` beside the code they cover.

- [ ] **Step 1: Install the toolchain**

```bash
cd frontend
npm install -D vitest@^3 @vitejs/plugin-react@^5 jsdom@^26 \
  @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

`@testing-library/react` v16 is the release that supports React 19; earlier majors will fail against React 19.2.4.

- [ ] **Step 2: Add the test scripts**

In `frontend/package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

Leave `dev`, `build`, `start` and `lint` untouched.

- [ ] **Step 3: Configure Vitest**

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    // Mirrors the "@/*" -> "src/*" alias in tsconfig.json.
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 4: Register the DOM matchers**

Create `frontend/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

This is what makes `.toBeInTheDocument()` and friends available.

- [ ] **Step 5: Write a smoke test proving the harness runs**

Create `frontend/src/utils/harness.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs a test", () => {
    expect(1 + 1).toBe(2);
  });

  it("has a DOM available", () => {
    const el = document.createElement("div");
    el.textContent = "hello";
    expect(el.textContent).toBe("hello");
  });
});
```

- [ ] **Step 6: Run and verify**

```bash
cd frontend
npm test
```

Expected: 2 passed. If the jsdom test fails, `environment: "jsdom"` did not take effect — check `vitest.config.ts` is at the frontend root.

- [ ] **Step 7: Delete the smoke test**

```bash
rm frontend/src/utils/harness.test.ts
```

It has served its purpose; the real tests in Tasks 3–5 replace it.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/vitest.setup.ts
git commit -m "test: add Vitest + React Testing Library harness

No frontend test framework existed. Uses @testing-library/react v16 for
React 19 support and mirrors the tsconfig @/* path alias."
```

---

## Task 3: `mediaUrl()` — fixes the directory image bug (#15)

Stored media paths are relative (`/uploads/profiles/x.jpg`). The frontend has three different ways of turning them into URLs, one of which is simply broken — `(public)/members/page.tsx:562` uses the raw value, which resolves against the Next.js origin instead of the API and 404s. This task builds the single correct helper; the next plan migrates every call site to it.

**Files:**
- Create: `frontend/src/utils/media.ts`
- Create: `frontend/src/utils/media.test.ts`

**Interfaces:**
- Consumes: `getApiBaseUrl()` from `@/utils/api`
- Produces: `mediaUrl(path: string | null | undefined): string | null` — absolute URL, or `null` when there is no usable path.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/utils/media.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mediaUrl } from "./media";

// getApiBaseUrl() reads window.location, so pin it to a known value.
vi.mock("./api", () => ({
  getApiBaseUrl: () => "http://localhost:8000/api/v1",
}));

describe("mediaUrl", () => {
  it("returns null for absent paths", () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl(undefined)).toBeNull();
    expect(mediaUrl("")).toBeNull();
  });

  it("returns null for whitespace-only paths", () => {
    expect(mediaUrl("   ")).toBeNull();
  });

  it("passes absolute URLs through untouched", () => {
    expect(mediaUrl("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg",
    );
    expect(mediaUrl("http://example.com/b.jpg")).toBe("http://example.com/b.jpg");
  });

  it("resolves a relative path against the API origin, not /api/v1", () => {
    // The bug being fixed: media is served from the server root, so the
    // /api/v1 suffix must be stripped or the URL 404s.
    expect(mediaUrl("/uploads/profiles/x.jpg")).toBe(
      "http://localhost:8000/uploads/profiles/x.jpg",
    );
  });

  it("resolves /static paths the same way", () => {
    expect(mediaUrl("/static/profile_photos/y.jpg")).toBe(
      "http://localhost:8000/static/profile_photos/y.jpg",
    );
  });

  it("tolerates a missing leading slash", () => {
    expect(mediaUrl("uploads/profiles/z.jpg")).toBe(
      "http://localhost:8000/uploads/profiles/z.jpg",
    );
  });

  it("does not double up slashes", () => {
    expect(mediaUrl("/uploads/a.jpg")).not.toContain("//uploads");
  });

  it("passes through data URIs", () => {
    const uri = "data:image/png;base64,iVBORw0KGgo=";
    expect(mediaUrl(uri)).toBe(uri);
  });
});
```

- [ ] **Step 2: Run and verify they fail**

```bash
cd frontend
npm test -- media
```

Expected: FAIL — `Failed to resolve import "./media"`.

- [ ] **Step 3: Implement**

Create `frontend/src/utils/media.ts`:

```ts
/**
 * Resolve a stored media path to an absolute URL.
 *
 * Uploads are stored as server-root-relative paths ("/uploads/profiles/x.jpg",
 * "/static/profile_photos/y.jpg"). Rendering those directly resolves them
 * against the Next.js origin rather than the API's, which 404s — that was the
 * directory-photo bug. Media is served from the API root, NOT from /api/v1,
 * so the API-version suffix is stripped before joining.
 *
 * Use this for every stored media path. It is the only correct convention.
 */
import { getApiBaseUrl } from "./api";

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  const trimmed = path.trim();
  if (!trimmed) return null;

  // Already absolute, or an inline payload — nothing to resolve.
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;

  const origin = getApiBaseUrl().replace(/\/api\/v\d+\/?$/, "");
  const suffix = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${origin}${suffix}`;
}
```

- [ ] **Step 4: Run and verify they pass**

```bash
cd frontend
npm test -- media
```

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/media.ts frontend/src/utils/media.test.ts
git commit -m "feat: add mediaUrl() helper for resolving stored media paths

Three conflicting conventions existed for turning a stored relative path
into a URL; the directory used the raw value, which resolved against the
Next origin instead of the API and 404'd. This is the single correct one.
Call sites migrate in the Phase 2 plan."
```

---

## Task 4: `matchesSearch()` — the shared search matcher

Three search bars need identical behaviour: split the query on whitespace, and require **every** term to appear in **some** field. Item #10 asks for this explicitly — *"it should fetch each and every word match in any field which person type, take a code from directory search option"*.

**Files:**
- Create: `frontend/src/utils/search.ts`
- Create: `frontend/src/utils/search.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `searchableText(record: unknown, fields: string[]): string`
  - `matchesSearch(record: unknown, query: string, fields: string[]): boolean`
  - `filterBySearch<T>(records: T[], query: string, fields: string[]): T[]`

  `fields` are key names read from the record; missing, `null` and non-string values are skipped. Matching is case-insensitive.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/utils/search.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterBySearch, matchesSearch, searchableText } from "./search";

const MEMBERS = [
  {
    first_name: "Rajesh",
    surname: "Goyal",
    father_name: "S/o Narayan Goyal",
    samaj_id: "AS-1024",
    mobile_masked: "XXXXXX7901",
    zone: "Shipra Path",
    lm_no: 44,
  },
  {
    first_name: "Sunita",
    surname: "Mital",
    father_name: "W/o Rajesh Mital",
    samaj_id: "AS-2048",
    mobile_masked: "XXXXXX3312",
    zone: "Kaveri Path",
    lm_no: null,
  },
];

const FIELDS = [
  "first_name",
  "surname",
  "father_name",
  "samaj_id",
  "mobile_masked",
  "zone",
  "lm_no",
];

describe("searchableText", () => {
  it("joins the named fields", () => {
    const text = searchableText(MEMBERS[0], FIELDS);
    expect(text).toContain("rajesh");
    expect(text).toContain("as-1024");
  });

  it("skips null and missing fields without throwing", () => {
    const text = searchableText(MEMBERS[1], FIELDS);
    expect(text).toContain("sunita");
    expect(text).not.toContain("null");
  });

  it("includes numeric fields", () => {
    expect(searchableText(MEMBERS[0], FIELDS)).toContain("44");
  });
});

describe("matchesSearch", () => {
  it("matches everything when the query is empty or blank", () => {
    expect(matchesSearch(MEMBERS[0], "", FIELDS)).toBe(true);
    expect(matchesSearch(MEMBERS[0], "   ", FIELDS)).toBe(true);
  });

  it("matches a single term case-insensitively", () => {
    expect(matchesSearch(MEMBERS[0], "RAJESH", FIELDS)).toBe(true);
  });

  it("requires EVERY term to match, each in any field", () => {
    // The defect this replaces: matching "rajesh goyal" as one substring
    // failed against a name carrying a middle name.
    expect(matchesSearch(MEMBERS[0], "rajesh goyal", FIELDS)).toBe(true);
  });

  it("matches terms drawn from different fields", () => {
    expect(matchesSearch(MEMBERS[0], "rajesh shipra", FIELDS)).toBe(true);
    expect(matchesSearch(MEMBERS[0], "goyal AS-1024", FIELDS)).toBe(true);
  });

  it("fails when any single term is absent", () => {
    expect(matchesSearch(MEMBERS[0], "rajesh mital", FIELDS)).toBe(false);
  });

  it("matches the visible tail of a masked mobile number", () => {
    expect(matchesSearch(MEMBERS[0], "7901", FIELDS)).toBe(true);
  });

  it("collapses runs of whitespace between terms", () => {
    expect(matchesSearch(MEMBERS[0], "  rajesh    goyal  ", FIELDS)).toBe(true);
  });

  it("matches a relation prefix written into the parentage field", () => {
    expect(matchesSearch(MEMBERS[1], "w/o rajesh", FIELDS)).toBe(true);
  });
});

describe("filterBySearch", () => {
  it("returns every record for a blank query", () => {
    expect(filterBySearch(MEMBERS, "", FIELDS)).toHaveLength(2);
  });

  it("narrows to matching records", () => {
    const found = filterBySearch(MEMBERS, "sunita", FIELDS);
    expect(found).toHaveLength(1);
    expect(found[0].surname).toBe("Mital");
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterBySearch(MEMBERS, "zzzz", FIELDS)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const before = [...MEMBERS];
    filterBySearch(MEMBERS, "rajesh", FIELDS);
    expect(MEMBERS).toEqual(before);
  });
});
```

- [ ] **Step 2: Run and verify they fail**

```bash
cd frontend
npm test -- search
```

Expected: FAIL — `Failed to resolve import "./search"`.

- [ ] **Step 3: Implement**

Create `frontend/src/utils/search.ts`:

```ts
/**
 * Multi-term, multi-field search.
 *
 * The rule, taken from the member directory and reused everywhere: split the
 * query on whitespace and require EVERY term to appear in SOME field. That is
 * what lets "rajesh goyal" match "Rajesh Kumar Goyal", and "rajesh shipra"
 * match a name in one field and an area in another.
 *
 * Matching a whole query as one substring — the approach this replaces — fails
 * both of those cases.
 */

/** Lower-cased concatenation of the named fields. Missing values are skipped. */
export function searchableText(record: unknown, fields: string[]): string {
  if (!record || typeof record !== "object") return "";
  const source = record as Record<string, unknown>;

  return fields
    .map((field) => {
      const value = source[field];
      if (value === null || value === undefined) return "";
      if (typeof value === "string" || typeof value === "number") return String(value);
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** True when every whitespace-separated term appears in at least one field. */
export function matchesSearch(
  record: unknown,
  query: string,
  fields: string[],
): boolean {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = searchableText(record, fields);
  return terms.every((term) => haystack.includes(term));
}

/** Non-mutating filter over `records` using `matchesSearch`. */
export function filterBySearch<T>(
  records: T[],
  query: string,
  fields: string[],
): T[] {
  if (!query.trim()) return [...records];
  return records.filter((record) => matchesSearch(record, query, fields));
}
```

- [ ] **Step 4: Run and verify they pass**

```bash
cd frontend
npm test -- search
```

Expected: 16 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/search.ts frontend/src/utils/search.test.ts
git commit -m "feat: add shared multi-term search matcher

Every term must appear in some field, which is what lets 'rajesh goyal'
match 'Rajesh Kumar Goyal'. Three search bars converge on this in later
plans, per changes.txt item 10."
```

---

## Task 5: `<EditButton>` component

Six icon-only edit buttons become labelled ones (Sweep A, next plan). This task builds the component they will use, modelled on the one already-correct instance at `admin/members/page.tsx:375`.

**Files:**
- Create: `frontend/src/components/ui/EditButton.tsx`
- Create: `frontend/src/components/ui/EditButton.test.tsx`

**Interfaces:**
- Consumes: `Pencil` from `lucide-react`
- Produces: `<EditButton onClick label? size? className? title? />` where `size` is `"sm" | "md"` (default `"md"`) and `label` defaults to `"Edit"`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ui/EditButton.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditButton } from "./EditButton";

describe("EditButton", () => {
  it("renders a visible 'Edit' label by default", () => {
    // The whole point of the change: the label must be readable text,
    // not an icon a user has to decode.
    render(<EditButton onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    render(<EditButton onClick={() => {}} label="Edit Room" />);
    expect(screen.getByText("Edit Room")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<EditButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is a real button element", () => {
    render(<EditButton onClick={() => {}} />);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });

  it("has an explicit type so it never submits a surrounding form", () => {
    render(<EditButton onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("appends custom classes without dropping its own", () => {
    render(<EditButton onClick={() => {}} className="ml-2" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("ml-2");
    expect(button.className).toContain("rounded");
  });

  it("exposes an accessible title when given one", () => {
    render(<EditButton onClick={() => {}} title="Edit profile via OTP" />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Edit profile via OTP",
    );
  });

  it("renders smaller padding at size sm", () => {
    const { rerender } = render(<EditButton onClick={() => {}} size="sm" />);
    const small = screen.getByRole("button").className;
    rerender(<EditButton onClick={() => {}} size="md" />);
    const medium = screen.getByRole("button").className;
    expect(small).not.toBe(medium);
  });
});
```

- [ ] **Step 2: Run and verify they fail**

```bash
cd frontend
npm test -- EditButton
```

Expected: FAIL — `Failed to resolve import "./EditButton"`.

- [ ] **Step 3: Implement**

Create `frontend/src/components/ui/EditButton.tsx`:

```tsx
"use client";

import { Pencil } from "lucide-react";

/**
 * A labelled edit button.
 *
 * Replaces the bare pencil icons scattered across the admin and dashboard
 * pages: an icon alone gives no indication of what it does, and offers a tap
 * target too small to hit comfortably on a phone.
 *
 * Styling follows the existing labelled button in admin/members/page.tsx.
 */
export interface EditButtonProps {
  onClick: () => void;
  /** Visible text. Defaults to "Edit". */
  label?: string;
  /** "sm" for dense table rows, "md" elsewhere. */
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

const SIZES = {
  sm: "px-2.5 py-1.5 text-[11px] gap-1",
  md: "px-3 py-2 text-xs gap-1.5",
} as const;

const ICON_SIZES = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
} as const;

export function EditButton({
  onClick,
  label = "Edit",
  size = "md",
  className = "",
  title,
}: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 font-bold whitespace-nowrap text-amber-700 transition-colors hover:bg-amber-100 ${SIZES[size]} ${className}`}
    >
      <Pencil className={ICON_SIZES[size]} />
      {label}
    </button>
  );
}
```

- [ ] **Step 4: Run and verify they pass**

```bash
cd frontend
npm test -- EditButton
```

Expected: 8 passed.

- [ ] **Step 5: Run the whole suite**

```bash
cd frontend && npm test
cd ../backend && python -m pytest tests/ -v
```

Expected: all green. This closes Phase 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/EditButton.tsx frontend/src/components/ui/EditButton.test.tsx
git commit -m "feat: add labelled EditButton component

Replaces bare pencil icons, which convey nothing and are hard to tap on a
phone. Call sites migrate in the Phase 2 plan (Sweep A). Closes Phase 0."
```

---

## Task 6: Retire `/register` and remove household links (#1, D9)

Only admins and role-holders can log in, so `/register` collects a password for an account that is refused at the login screen by design. The directory's Apply for New Membership modal already does the real job. This task removes the page and every link to it.

**Files:**
- Delete: `frontend/src/app/(auth)/register/page.tsx`
- Modify: `frontend/src/components/layout/Navbar.tsx:316-324`
- Modify: `frontend/src/components/layout/Footer.tsx:21`
- Modify: `frontend/src/components/home/CovenantHero.tsx:160`
- Modify: `frontend/src/app/(auth)/login/page.tsx:311-316`

**Interfaces:**
- Consumes: nothing
- Produces: no route at `/register`. Membership applications go through the directory modal at `/members`.

> **Backend note:** leave `POST /auth/register` and `POST /auth/register/send-otp` in place. Phase 6 rewires the directory modal onto that same OTP flow; deleting the endpoints now would strand it.

- [ ] **Step 1: Remove the Navbar link**

In `frontend/src/components/layout/Navbar.tsx`, delete the whole `<>...</>` fragment in the logged-out branch (lines 316-324):

```tsx
                  <>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center bg-vermilion px-6 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-paper"
                    >
                      Register a household
                    </Link>
                  </>
```

Replace the whole `) : (...)` alternative with `) : null}`, keeping the logged-in branch untouched. Then remove `Link` from the imports **only if** no other usage remains in the file — check with `grep -n "<Link" src/components/layout/Navbar.tsx`.

- [ ] **Step 2: Remove the Footer link**

In `frontend/src/components/layout/Footer.tsx`, delete line 21 from the "Take part" group:

```tsx
      { label: "Register a household", href: "/register" },
```

Leave "Book the Bhavan", "Upcoming events" and "Donation schemes" in place.

- [ ] **Step 3: Remove the hero button**

In `frontend/src/components/home/CovenantHero.tsx`, delete line 160:

```tsx
                <ActionLink href="/register" variant="outline">Register as Member</ActionLink>
```

The three remaining `ActionLink`s (Bhavan Booking, Directory, Events) stay.

- [ ] **Step 4: Remove the login-page link**

In `frontend/src/app/(auth)/login/page.tsx`, delete the block at lines 311-316:

```tsx
        <div className="text-center text-xs text-zinc-500 pt-2">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-amber-600 hover:text-amber-700">
            Register here
          </Link>
        </div>
```

Then remove the `Link` import if nothing else in the file uses it.

- [ ] **Step 5: Delete the page**

```bash
rm frontend/src/app/\(auth\)/register/page.tsx
```

- [ ] **Step 6: Verify no references survive**

```bash
cd frontend
grep -rn '"/register"' src --include=*.tsx
grep -rni "register a household" src
```

Expected: **no output from either.** Any hit is a dead link — fix it before continuing.

Note `grep -rn "/register"` (without quotes) will also match `/registrations` and the API call `/events/${id}/register`. Those are unrelated and must stay.

- [ ] **Step 7: Verify the build and tests**

```bash
cd frontend
npm run build
npm test
```

Expected: build succeeds with no "module not found" for the deleted page; tests still pass.

- [ ] **Step 8: Verify in the browser**

Start the app (`npm run dev`, and `python run.py` in `backend/`). Confirm:
- `/register` returns a 404
- The home hero shows three buttons, not four
- The footer's "Take part" column has three links
- The login page has no "Register here"
- Opening the navbar menu while logged out shows no register button

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: retire /register and remove household links (#1)

Only admins and role-holders can log in, so /register created a password
for an account the login screen refuses by design. Membership applications
go through the directory's apply modal instead.

Backend /auth/register endpoints stay — Phase 6 rewires the modal onto them."
```

---

## Task 7: Remove the other-sites section from the home page (#2)

**Files:**
- Modify: `frontend/src/app/(public)/page.tsx:4,18`
- Delete: `frontend/src/components/home/PortalIndex.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: home page renders `CovenantHero · Padadhikari · Ledger · Gallery · Testament · Join`.

- [ ] **Step 1: Remove the import and the usage**

In `frontend/src/app/(public)/page.tsx`, delete line 4:

```tsx
import PortalIndex from "@/components/home/PortalIndex";
```

and line 18:

```tsx
      <PortalIndex />
```

The file becomes:

```tsx
import CovenantHero from "@/components/home/CovenantHero";
import Padadhikari from "@/components/home/Padadhikari";
import Ledger from "@/components/home/Ledger";
import Gallery from "@/components/home/Gallery";
import Testament from "@/components/home/Testament";
import Join from "@/components/home/Join";

export default function HomePage() {
  return (
    // No overflow-x here: `overflow-x: hidden` computes overflow-y to `auto`,
    // which turns this into a scroll container and freezes the hero's sticky
    // stage. Horizontal bleed is clipped on <body> with `clip` instead.
    <div className="flex w-full flex-col bg-paper">
      <CovenantHero />
      <Padadhikari />
      <Ledger />
      <Gallery />
      <Testament />
      <Join />
    </div>
  );
}
```

Keep the comment — it documents a real layout trap.

- [ ] **Step 2: Delete the component**

```bash
rm frontend/src/components/home/PortalIndex.tsx
```

- [ ] **Step 3: Verify nothing else imports it**

```bash
cd frontend
grep -rn "PortalIndex" src
```

Expected: no output.

- [ ] **Step 4: Verify the build**

```bash
cd frontend
npm run build
```

Expected: success.

- [ ] **Step 5: Verify in the browser**

Load `/`. The section headed "All Samaj Sites & Matrimonial Links" — with its All Sites / Samaj Portals / Matrimonial / Community Network filter tabs — is gone. The Ledger section now runs straight into the Gallery.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove the partner-sites section from the home page (#2)

Removes the whole PortalIndex section, both its internal portal cards and
the seven external partner links. Navigation is served by the navbar."
```

---

## Task 8: Real office bearers on the About page (#24)

`/about` hardcodes three invented people — "Shri Ramesh / Suresh / Mahesh Agrawal" — with `image` values (`/team1.jpg`–`/team3.jpg`) that **do not exist on disk** and are never rendered; the component draws initials instead. The real three live in the roster the home page already uses, with real photographs.

**Files:**
- Modify: `frontend/src/app/(public)/about/page.tsx:6-10,155-171`

**Interfaces:**
- Consumes: `LEADERS` and `photo()` from `@/components/home/padadhikariRoster`
- Produces: nothing consumed downstream

- [ ] **Step 1: Replace the placeholder array with the real roster**

In `frontend/src/app/(public)/about/page.tsx`, delete lines 6-10:

```tsx
const team = [
  { name: "Shri Ramesh Agrawal", role: "President", image: "/team1.jpg" },
  { name: "Shri Suresh Agrawal", role: "General Secretary", image: "/team2.jpg" },
  { name: "Shri Mahesh Agrawal", role: "Treasurer", image: "/team3.jpg" },
];
```

and add to the imports at the top:

```tsx
import Image from "next/image";
import { LEADERS, photo } from "@/components/home/padadhikariRoster";
```

`LEADERS` is already ordered President → General Secretary → Treasurer, which is the order requested.

- [ ] **Step 2: Render the real people and their photographs**

Replace the `{team.map(...)}` block at lines 159-171 with:

```tsx
            {LEADERS.map((leader) => (
              <div key={leader.slug} className="p-6 rounded-2xl border border-zinc-200/50 bg-white text-center space-y-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden mx-auto border border-amber-500/20">
                  <Image
                    src={photo(leader.slug)}
                    alt={`${leader.latin} — ${leader.name}`}
                    fill
                    sizes="96px"
                    className="object-cover object-top"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{leader.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{leader.latin}</p>
                  <p className="text-xs text-amber-600 font-semibold mt-1">{leader.designationEn}</p>
                </div>
              </div>
            ))}
```

The photographs at `public/padadhikari/ramgopal-singhal-lead.jpg`, `lakhmi-chand-singhal.jpg` and `pramod-kumar-gupta.jpg` are confirmed present.

- [ ] **Step 3: Verify the build**

```bash
cd frontend
npm run build
```

Expected: success. A failure mentioning `team` means a reference was missed — `grep -n "team" src/app/\(public\)/about/page.tsx` should return nothing.

- [ ] **Step 4: Verify in the browser**

Load `/about` and scroll to "Committee Board". Confirm the three real names appear in Devanagari with their transliterations and photographs, ordered President → General Secretary → Treasurer, and that no "Shri Ramesh/Suresh/Mahesh Agrawal" remains.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/\(public\)/about/page.tsx
git commit -m "fix: show the real office bearers on the About page (#24)

The page hardcoded three invented names with image paths that don't exist
on disk and were never rendered. Now reads LEADERS from the same roster the
home page uses, in the same order, with the real photographs."
```

---

## Task 9: Enlarge the blog filter and write-blog controls (#17)

These are not lucide icons — they are emoji inside a `<select>` and a button, at `text-xs` with tight padding, which is why they read as small.

**Files:**
- Modify: `frontend/src/app/(public)/blog/page.tsx:216-256`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Enlarge the year filter**

In `frontend/src/app/(public)/blog/page.tsx`, on the year `<select>` (around line 219), change:

```
className="px-3.5 py-2 rounded-xl bg-zinc-800/90 text-white border border-zinc-700 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
```

to:

```
className="px-4 py-2.5 rounded-xl bg-zinc-800/90 text-white border border-zinc-700 text-sm font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
```

- [ ] **Step 2: Enlarge the month filter**

Apply the identical change to the month `<select>` (around line 229).

- [ ] **Step 3: Enlarge the write-blog button**

On the "✍️ Write a Blog" button (around line 250), change:

```
className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
```

to:

```
className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
```

All three now sit at `text-sm` with matching vertical padding, so the row reads as one set of controls.

- [ ] **Step 4: Verify the build**

```bash
cd frontend
npm run build
```

- [ ] **Step 5: Verify in the browser**

Load `/blog`. The two dropdowns and the Write a Blog button are visibly larger, the same height as each other, and their emoji legible. Check at 320px width that the row still wraps without overflowing — `flex-wrap` is already present.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/\(public\)/blog/page.tsx
git commit -m "style: enlarge blog year/month filters and write-blog button (#17)

All three move from text-xs to text-sm with matching padding so the row
reads as one set of controls and the emoji are legible."
```

---

## Task 10: Rename and reposition the membership button (#16)

The button currently sits in the hero, above and away from the search bar, and reads "Apply for Membership".

**Files:**
- Modify: `frontend/src/app/(public)/members/page.tsx:462-503`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Remove the button from the hero**

In `frontend/src/app/(public)/members/page.tsx`, delete the `<button>` at lines ~465-472 that renders `<UserPlus className="w-4 h-4" /> Apply for Membership`, along with the now-empty wrapper `<div>` around it. Leave the heading and description above it intact.

- [ ] **Step 2: Place it beside the search bar**

The search row at line ~481 is a flex container holding the input and the "Total Members" chip. Add the button as a third child, immediately after the `Total Members` `<div>` and inside the same flex row:

```tsx
            <button
              onClick={() => {
                setShowRegisterModal(true);
                setRegStep("details");
                setRegError("");
                setRegSuccessMsg("");
              }}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-amber-600 hover:to-orange-700"
            >
              <UserPlus className="w-4 h-4" /> Apply for New Membership
            </button>
```

The four state setters are copied verbatim from the button being removed, so behaviour is unchanged.

- [ ] **Step 3: Rename the empty-state button too**

At line ~535 the "no results" panel has a second button reading `Member Not Listed? Apply for Membership`. Change its text to:

```tsx
                <UserPlus className="w-4 h-4" /> Member Not Listed? Apply for New Membership
```

- [ ] **Step 4: Confirm the wording is consistent**

```bash
cd frontend
grep -rn "Apply for Membership" src
```

Expected: no output — every instance now reads "Apply for New Membership".

- [ ] **Step 5: Verify the build**

```bash
cd frontend
npm run build
```

- [ ] **Step 6: Verify in the browser**

Load `/members`. Confirm:
- The button sits on the same row as the search input, immediately visible without scrolling
- It reads "Apply for New Membership"
- Clicking it opens the application modal on the details step
- At 320px the row wraps cleanly (the container is `flex-col sm:flex-row`) and the button is fully visible

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/\(public\)/members/page.tsx
git commit -m "feat: rename and reposition the membership button (#16)

'Apply for Membership' -> 'Apply for New Membership', moved from the hero
onto the search row so it is visible without scrolling."
```

---

## Task 11: Phase verification

No code changes. Confirms the phase is genuinely complete before the next plan builds on it.

**Files:** none

- [ ] **Step 1: Run every test**

```bash
cd frontend && npm test
cd ../backend && python -m pytest tests/ -v
```

Expected: all green. Record the counts.

- [ ] **Step 2: Verify the production build**

```bash
cd frontend && npm run build
```

Expected: success, no warnings about missing modules.

- [ ] **Step 3: Confirm no dead references remain**

```bash
cd frontend
grep -rn '"/register"' src --include=*.tsx
grep -rni "register a household" src
grep -rn "PortalIndex" src
grep -rn "Apply for Membership" src
grep -rn "Shri Ramesh Agrawal" src
```

Expected: **no output from any of the five.**

- [ ] **Step 4: Regression-check the login constraint**

The governing constraint must still hold. Confirm both gates are untouched:

```bash
cd backend
grep -n "custom_role_id is not None" app/routers/auth.py
```

Expected: two hits, at roughly lines 170 and 255. If either is missing, a task weakened the login policy — stop and investigate.

- [ ] **Step 5: Walk the app**

With both servers running, confirm:

| Page | Expectation |
|---|---|
| `/` | No partner-sites section; hero has three buttons |
| `/about` | Three real office bearers with photographs, correct order |
| `/blog` | Filters and write-blog button visibly larger |
| `/members` | "Apply for New Membership" beside the search bar |
| `/register` | 404 |
| `/login` | No "Register here" link |

- [ ] **Step 6: Commit any fixes**

If steps 1-5 surfaced problems, fix and commit them. If everything passed, there is nothing to commit — say so rather than creating an empty commit.

---

## Definition of Done

- [ ] `npm test` passes in `frontend/`
- [ ] `python -m pytest tests/ -v` passes in `backend/`
- [ ] `npm run build` succeeds
- [ ] All five grep checks in Task 11 Step 3 return nothing
- [ ] The login constraint is intact (Task 11 Step 4)
- [ ] Every page in the Task 11 Step 5 table behaves as described
- [ ] Items #1, #2, #16, #17, #24 and decision D9 are complete
- [ ] `mediaUrl()`, `matchesSearch()` and `<EditButton>` exist, are tested, and are ready for the Phase 2 plan

**Deferred to the Phase 5 plan:** item #14 (replace Day-1/2/3 with first-day + additional-day rates). It is listed under Phase 1 in the spec, but it changes the shape of a data structure the pricing engine will consume, so it belongs with the pricing work rather than ahead of it.
