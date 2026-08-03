# Agrawal Samaj Portal — Change Set Design

**Date:** 2026-08-03
**Source:** `changes.txt` (26 requested changes)
**Status:** Approved for planning

---

## Context

`changes.txt` lists 26 changes to the Agrawal Samaj Management Portal, written as
short field notes rather than specifications. Several are one-line label edits;
several others are one-line descriptions of problems whose causes sit deep in the
backend. This document resolves each into concrete work, groups related items so
shared code is written once, and records the decisions taken along the way.

Three items turned out to be symptoms of causes elsewhere in the system, and are
documented as such rather than patched where they were observed:

- **#8** (ticket cap) is caused by the login policy, not by the ticket code.
- **#13** (rate card) is two independent bugs wearing one sentence.
- **#7** (name disappears) shares a root cause with the search defects in #5/#10.

---

## Governing constraint: who can log in

Only these accounts may authenticate:

- `UserRole.ADMIN`
- `UserRole.SUPER_ADMIN`
- `UserRole.VOLUNTEER`
- any user with a non-null `custom_role_id`

Ordinary members **never log in**. This is already enforced identically in both
login paths — `app/routers/auth.py:168` (password) and `app/routers/auth.py:253`
(phone OTP) — and requires no new work. It is recorded here because it is load
bearing: it is the direct cause of #8, it determines what `/register` is for, and
any change that reintroduces a member-facing session would violate it.

**Every phase must preserve this.** A regression check belongs in the plan.

---

## Decisions

| # | Question | Decision |
|---|---|---|
| D1 | Home page: drop external links only, or the whole section? | Delete the entire `PortalIndex` section |
| D2 | What does "apply on dates" mean for rate cards? | Rate cards must drive **real booking prices** |
| D3 | Which OTP channel is live? | WhatsApp sidecar is running — diagnose backend ↔ sidecar |
| D4 | Scope of "responsive" and "align"? | Full audit of every page |
| D5 | Which "about section" has the wrong three members? | The `/about` page placeholders |
| D6 | How should S/o · D/o · W/o be modelled? | Relation dropdown + separate name field |
| D7 | How should dormitories work? | New room type + AC flag, admin-created |
| D8 | What does cancelling a pass do? | Void the pass **and** record a refund |
| D9 | What happens to `/register`? | Retire it; consolidate into the directory's apply modal |

### Standing assumption (flagged, not blocking)

**Removing Day-2 / Day-3 rates changes multi-day prices.** The existing Day-1 /
Day-2 / Day-3 columns are *cumulative totals*, not per-day rates — First Unit is
₹15,000 for one day, ₹25,000 for two, ₹33,000 for three. Because D2 makes this
table drive real prices, #14 means multi-day stays become `day1 × nights`:

| Stay | Before | After |
|---|---|---|
| 1 day | ₹15,000 | ₹15,000 |
| 2 days | ₹25,000 | ₹30,000 |
| 3 days | ₹33,000 | ₹45,000 |

This was raised and Phase 1 was approved with it stated. If the multi-day discount
should be preserved, it needs a different mechanism (e.g. a per-card discount
percentage) and this spec must be revised before Phase 5 begins.

---

## Phase 0 — Shared foundations

Built first because later phases collapse into small diffs once these exist.

### `mediaUrl(path)` — `frontend/src/utils/api.ts`

One rule for turning a stored relative media path into an absolute URL. The
codebase currently has three conventions, one of which is simply broken:

| Location | Current | Correct? |
|---|---|---|
| `dashboard/family/page.tsx:798` | `startsWith("http") ? p : ${getApiBaseUrl()}${p}` | yes |
| `dashboard/profile/page.tsx:118` | `${getApiBaseUrl().replace('/api/v1','')}${p}` | inconsistent |
| `(public)/members/page.tsx:562` | `src={p}` — raw | **no — this is bug #15** |

The raw form resolves against the Next.js origin instead of the API origin, so
directory photos 404. `mediaUrl()` becomes the single convention; all call sites
migrate to it.

### `matchesSearch(record, query, fields)` — `frontend/src/utils/search.ts`

The directory's matcher — split the query on whitespace, require **every** term to
appear in **some** field — extracted for reuse. Items #5, #10 and #26 all describe
this behaviour, and #10 says so explicitly: *"take a code from directory search
option"*. Three search bars converge on this one function.

### `<EditButton>` — `frontend/src/components/ui/`

Labelled edit button replacing bare icon buttons, modelled on the existing correct
instance at `admin/members/page.tsx:375`.

---

## Phase 1 — Content and labels

No schema changes. Lowest risk; can ship independently.

| Item | Change | Location |
|---|---|---|
| #1 | Remove "Register a household" | `Navbar.tsx:322`, `Footer.tsx:21` |
| #2 | Delete the whole section | `(public)/page.tsx:18` + delete `PortalIndex.tsx` |
| D9 | Retire `/register` | delete page; remove `CovenantHero.tsx:160`, `login/page.tsx:314` |
| #14 | Drop Day-2 / Day-3 columns | `admin/pricing/page.tsx:430,438`, `(public)/bhavan/page.tsx:66-91`, backend defaults |
| #16 | Rename → "Apply for New Membership", move beside the search bar | `(public)/members/page.tsx:476` |
| #17 | Enlarge year/month filter and "Write a Blog" icons | `(public)/blog/page.tsx:214,253` |
| #24 | Replace placeholder leaders with the real roster | `(public)/about/page.tsx:6-10` |

**#2 and #1 interact:** deleting `PortalIndex` removes the "Register Household"
card automatically. Navbar and Footer still need their own edits.

**#24 detail:** `/about` hardcodes three fake people — "Shri Ramesh / Suresh /
Mahesh Agrawal" with `/team1.jpg`–`/team3.jpg`. The real three live in
`components/home/padadhikariRoster.ts:34` (`LEADERS`). The about page imports that
array and renders it in roster order — President, General Secretary, Treasurer — so
the two pages can never drift apart again.

---

## Phase 2 — Directory and members

Items #4, #5, #15, #18. (#6 is handled in Sweep B, which touches these same files.)

### #15 — Directory photos invisible

Fixed by Phase 0's `mediaUrl()`. Call sites: `(public)/members/page.tsx:562` and
`:1074`, `admin/members/page.tsx:287`, `dashboard/members/page.tsx:112`,
`dashboard/chat/page.tsx:539`.

### #18 — S/o · D/o · W/o

Add `parent_relation` to `users`, holding `S/o` · `D/o` · `W/o`. The guessing logic
in `frontend/src/utils/member.ts` (`formatParentage` / `RELATION_MARKER`) is retired —
the relation becomes stored data, not a regex inference.

- **Edit form** and **Apply for New Membership form**: relation dropdown + name input
- **Directory list and detail card**: render the stored prefix
- **Backfill**: one-time parse of existing `father_name` values to split any
  embedded marker into the new column

### #5 — Directory search returns wrong/missing results

Two distinct causes, and the second cannot be fixed on the client:

1. The client matcher is sound but searches `mobile`, which is `null` whenever
   `mobile_private` is set. It should search `mobile_masked`, which is always returned.
2. **`membership.py:418` filters to `role == MEMBER or is_member == True`.** Imported
   directory rows with `is_member = False` are never sent to the browser at all, so
   no client-side change can surface them. This matches the report that *"all the
   members should fetch properly"*.

Cause 2 needs confirmation against production data before the fix is chosen —
widen the filter, or correct the `is_member` flag on imported rows. **Same root
cause as booking-search bug 7 in Phase 3; one investigation settles both.**

### #4 — Edit button on the view-detail card

Add `<EditButton>` to the bottom of the member detail modal, wired to the existing
OTP edit flow.

---

## Phase 3 — Event booking (member-facing)

Items #7, #8, #19, plus a search rewrite. (#20 is handled in Sweep C.)

### #8 — Members capped at 4 tickets instead of 10

**Root cause: the governing login constraint.** `app/routers/events.py:296` reads:

```python
is_member_user = bool(current_user and current_user.is_member)
max_tickets_allowed = 10 if is_member_user else 4
```

Members never log in, so `current_user` is always `None`, so `is_member_user` is
always `False`, so the cap is always 4. The frontend's Member/Guest toggle
(`events/[id]/page.tsx:57`) independently promises 10. The UI offers ten, the API
grants four.

**This cannot be fixed by raising a number.** Member status must be derived from
the *attendees* rather than the viewer: each attendee chosen from the directory
dropdown already carries a resolved `user_id`. The backend checks those users'
member status and sets the cap accordingly. This also makes the Member/Guest
toggle reflect something real.

Also verify `Event.max_per_user` (default **5**, `models/event.py:94`) — it is a
second, independent cap that will bite at 5 once the first is lifted.

### Booking search rewrite — `events/[id]/page.tsx:68-93`

A bespoke matcher, separate from the directory's, with eight defects:

**Logic**

1. **Search box double-bound to the booker's name.** `handleMemberSearch` calls
   `setGuestName(query)` on every keystroke; `selectMemberFromDropdown` then
   overwrites it. **This is the root cause of #7** ("after the ticket is added name
   is removed from the search bar") — two fields fighting over one piece of state.
2. **Single-token substring match.** The whole query matches as one string, so
   `"rajesh goyal"` fails against "Rajesh Kumar Goyal".
3. **Dedupe by lowercased full name**, blocking two different people who share a
   name. Should key on `user_id`.
4. **`passCount` desyncs** — `removeAttendee` floors it at 1 while the list is empty.

**Data**

5. **`m.contact_mobile` is dead code** — `/membership/members` never returns that key.
6. **`m.mobile` is `null` for private numbers**; `mobile_masked` should be searched.
7. **Same invisible-members problem as #5** — the `is_member` filter.
8. **Silent 10-result cap** labelled with the capped count, so 40 matches reads as 10.

**Fix:** delete the bespoke matcher, route through Phase 0's `matchesSearch()`,
split search-query state from `guestName`, search `mobile_masked`, dedupe on
`user_id`, derive `passCount` from `selectedAttendees.length`, and show a true
count ("showing first 10 of N").

### #7 — Remove the "+ Add Ticket" button

Remove the button beside the search input (`events/[id]/page.tsx:463-467`). The
name-clearing half of #7 is fixed by the state split above.

### #19 / #20 — Labels

Label above the search: **"Search member to book a ticket"**. Placeholder per
Sweep C.

---

## Phase 4 — Event admin

Items #9, #10, #25, #26.

### #9 — Per-person pass details

**The backend is already correct.** `services/whatsapp_service.py:486` writes each
attendee's own name, phone and `user_id` to their own `EventPass` row. The gap is
entirely in the admin UI: `admin/events/page.tsx:536-541` renders four columns —
event title, booker, a pass *count*, payment status — so a 4-pass booking shows as
the number "4" against one person's name.

Rebuild as **one row per pass**: attendee name · event name · booking date ·
phone · Samaj ID · payment status · pass status. A 4-pass booking renders 4 rows,
each carrying its own attendee's name.

### #10 / #26 — Search and event-wise organisation

Two separate controls, both requested:

- **Free-text search** over every column, via Phase 0's `matchesSearch()`
- **Event-wise grouping/filter** — both items say *"sort"*: *"sort the events with
  there names"* and *"sort them event wise"*. A search box alone cannot show one
  event's registrations together.

### #25 / #26 — Cancel a pass, with refund

Schema:

- `PassStatus` gains `CANCELLED`
- `event_passes` gains `cancelled_by`, `cancelled_at`, `cancel_reason`,
  `refund_amount`, `refund_status` (`pending` · `paid` · `not_applicable`)

Behaviour:

- Admin cancels any pass, giving a reason
- `/verify-pass` denies a cancelled pass at the gate
- `event.passes_sold` decrements, returning the seat to the pool
- Refund amount and status recorded, surfaced on the receipt
- Cancelled passes remain listed in the same table, covered by the same search and
  event filter

---

## Phase 5 — Bhavan

Items #13, #21, #23. Depends on Phase 1 (#14 changes the rate shape #13 consumes).

### #13 — Rate card cannot save, and never applied

Two independent bugs:

**Cannot save.** `routers/bookings.py:952` writes to
`static/bhavan_category_rates.json`. Serverless filesystems are read-only, so the
write throws — consistent with commit `70c5d87`, which added database fallbacks for
exactly this class of failure elsewhere. **Fix:** move rate cards into a
`bhavan_rate_cards` table.

**Never applied.** The Master Rate List is display-only. Real prices come from
`_price_for_day()` (`bookings.py:66-82`), which consults special-event pricing,
then `RoomPricingRule`, then `room.price_per_day` — and never looks at the rate
table at all. Per D2, `_price_for_day()` gains a step so a Saava card's
`rate_category` selects the rate table applying to those dates:

```
special event price
  → Saava card's rate table       ← new
    → RoomPricingRule
      → room.price_per_day
```

Note the standing assumption above: with #14 removing Day-2/Day-3, multi-day
stays price as `day1 × nights`.

### #21 — Dormitories

`Room.type` gains `dormitory` alongside `hall` · `room` · `facility`; `Room` gains
a nullable `is_ac` flag. Admins create dormitory units at `/admin/bookings` with
their own rates. They become bookable and appear in the rate tables as AC and
Non-AC rows.

### #23 — Admin rejects a Bhavan booking

`BookingStatus.REJECTED` **already exists** (`models/booking.py:23`) with no
endpoint or UI behind it. Add a reject endpoint taking a reason, a Reject button
beside the existing Approve at `admin/bookings/page.tsx:219`, and applicant
notification. Record who rejected it, matching the existing `approved_by` pattern.

---

## Phase 6 — OTP delivery for new applications

Item #22.

**The approve/reject half already works.** Registration creates a pending
`MembershipRequest` (`auth.py:670-687`) and `/admin/requests` approves or rejects it.
Per D9, this flow now lives behind the directory's Apply for New Membership modal.

**The delivery half fails.** `send_otp_message()` tries WhatsApp, falls back to
Twilio SMS, and returns `CHANNEL_NONE` if neither lands; `_otp_send_response()`
then raises a 502 (`auth.py:229`). Per D3 the sidecar is running, so the trace is:

1. `WHATSAPP_WEB_API_KEY` matching on **both** sides — a mismatch rejects every
   send; a missing key silently accepts unauthenticated ones
2. `WHATSAPP_WEB_URL` reachable from the deployed backend
3. Sidecar session state — an unlinked device fails every send

Also surface the real failure to the user instead of the current generic message,
so the next occurrence is diagnosable from the UI.

---

## Phase 7 — Responsive and alignment audit

Items #11, #12. Runs last so it covers UI added by earlier phases.

Every page at four breakpoints: **320px** (8" phones) · **768px** (tablet) ·
**1280px** (laptop) · **2560px** (32" desktop). Fix horizontal overflow, cramped
tap targets, broken table layouts, and misalignment.

---

## Cross-cutting sweeps

These span phases and are tracked separately so nothing is missed.

### Sweep A — Edit buttons (#3)

Convert icon-only edit buttons to labelled buttons:

| File | Line | Icon |
|---|---|---|
| `(public)/members/page.tsx` | 658 | `Edit3` |
| `admin/bookings/page.tsx` | 378 | `Pencil` |
| `admin/events/page.tsx` | 510 | `Edit` |
| `admin/roles/page.tsx` | 299 | `Edit3` |
| `admin/special-events/page.tsx` | 538 | `Pencil` |
| `dashboard/family/page.tsx` | 1047 | `Edit2` |

Reference implementation: `admin/members/page.tsx:375`.

**Explicitly excluded — decorative, not buttons.** Converting these would turn
page headings into controls:

- `admin/requests/page.tsx:101` — section heading
- `admin/requests/page.tsx:212` — empty-state illustration
- `(public)/members/page.tsx:701` — modal header
- `components/blog/BlogEditor.tsx:292` — field adornment

### Sweep B — Last four digits (#6)

Backend — `mask_phone_number()` at `membership.py:122`: `clean[-3:]` → `clean[-4:]`.
This one function serves four call sites: `:449`, `:471`, `:721`, and `:668`, which
returns it under the **different key name `masked_phone`** and is easy to miss.

Frontend hardcoded fallbacks — **note the X count**. These use seven X's, correct
for three digits; last-four on a 10-digit number needs **six**:

| File | Line | Current | Correct |
|---|---|---|---|
| `(public)/members/page.tsx` | 604 | `XXXXXXX${slice(-3)}` | `XXXXXX${slice(-4)}` |
| `(public)/members/page.tsx` | 733 | `"XXXXXXX..."` | six X's |
| `(public)/members/page.tsx` | 1189 | `XXXXXXX${slice(-3)}` | `XXXXXX${slice(-4)}` |
| `dashboard/members/page.tsx` | 162 | displays `mobile_masked` | verify after backend fix |

Missing the X count leaves 11-character phone numbers on screen.

### Sweep C — Search placeholders (#20)

Item #20 says search bar**s**. Apply the faded-grey placeholder
`name / father's name / last four digits of mobile number` to **every** member
search input:

1. Directory search — `(public)/members/page.tsx:488`
2. Event booking search — `events/[id]/page.tsx:450`
3. Admin event registration search — new in Phase 4

---

## Schema changes

| Table | Change | Item |
|---|---|---|
| `users` | `+ parent_relation` (S/o · D/o · W/o) | #18 |
| `rooms` | `+ is_ac`; `type` gains `dormitory` | #21 |
| `event_passes` | `+ cancelled_by, cancelled_at, cancel_reason, refund_amount, refund_status` | #25 |
| `PassStatus` enum | `+ CANCELLED` | #25 |
| `bhavan_rate_cards` | **new table** — replaces the JSON file | #13 |

Follow the existing convention: an Alembic revision plus best-effort
`ALTER TABLE` statements in the `app/main.py` startup block (`main.py:55-80`),
which is how every prior column in this codebase was added.

---

## Sequencing

```
Phase 0 (foundations)
   │
   ├──→ Phase 1 (content) ──→ Phase 5 (bhavan)
   │
   ├──→ Phase 2 (directory) ─┐
   │                         ├─ share one is_member investigation
   ├──→ Phase 3 (booking) ───┘
   │
   └──→ Phase 4 (event admin)

Phase 6 (OTP) — independent, may run at any time

                    ⋯ all of the above ⋯
                            │
                            ▼
                   Phase 7 (responsive) — last

Sweeps A / B / C run alongside the phases that touch the same files:
   Sweep A (edit buttons)  → with Phases 2, 4, 5
   Sweep B (last 4 digits) → with Phase 2
   Sweep C (placeholders)  → with Phases 2, 3, 4
```

- **Phase 0 first** — everything else depends on it
- **Phases 1–4** independent of each other
- **Phase 5 after Phase 1** — #14 changes the rate shape #13 consumes
- **Phase 6** independent; largely diagnosis
- **Phase 7 last** — must cover UI added by earlier phases

---

## Traceability

Every line of `changes.txt` accounted for:

| # | Request | Phase |
|---|---|---|
| 1 | Remove register household everywhere | 1 |
| 2 | Remove other-sites section from home | 1 |
| 3 | Pencil icon → edit button everywhere | Sweep A |
| 4 | Edit button on view-detail card | 2 |
| 5 | Members search broken / incomplete | 2 |
| 6 | Show last four digits everywhere | Sweep B |
| 7 | Remove Add Ticket; name lost from search | 3 |
| 8 | Members capped at 4 tickets, not 10 | 3 |
| 9 | Per-person names on admin registrations and passes | 4 |
| 10 | Search + event-wise sort in event registration | 4 |
| 11 | Responsive 32" → 8" | 7 |
| 12 | Align everything properly | 7 |
| 13 | Sawa rate card cannot save or apply | 5 |
| 14 | Remove two/three-day rates from Master Rate List | 1 |
| 15 | Directory images not visible | 2 |
| 16 | Rename and reposition apply button | 1 |
| 17 | Enlarge blog filter and write-blog icons | 1 |
| 18 | S/o D/o — user picks relation, writes name | 2 |
| 19 | "Search member to book a ticket" label | 3 |
| 20 | Faded placeholder text in search bars | Sweep C |
| 21 | Dormitory, AC and non-AC | 5 |
| 22 | Registration OTP not sending; admin approve/reject | 6 |
| 23 | Admin can reject a Bhavan booking | 5 |
| 24 | Three main members in the about section | 1 |
| 25 | Admin can cancel any pass | 4 |
| 26 | Cancelled passes listed, sortable, searchable | 4 |
