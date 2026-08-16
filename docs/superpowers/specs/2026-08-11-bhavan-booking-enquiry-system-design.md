# Bhavan Booking Enquiry System — Design

**Date:** 2026-08-11
**Source requirements:** `bhavan-booking-enquiry-system-prd.md`
**Status:** Approved for planning

---

## 1. Context and scope

The previous Bhavan booking module was deliberately removed (`changes.txt` item 12:
*"remove everything related to bhavan booking we start it from the beginning"*). Its models
(`booking.py`, `voucher.py`), routers (`bookings.py`, `special_events.py`, `vouchers.py`) and
seven frontend pages are staged as deleted. This design replaces it from scratch.

`bhavan-booking-enquiry-system-prd.md` governs this module. Where it conflicts with
`Agrawal_Samaj_Requirements.txt` §9 (which describes login-required booking with online payment),
the PRD wins: no customer accounts, no payment gateway, enquiries rather than confirmed bookings,
and an admin-configurable rule engine.

### In scope (PRD §56 "Must Have")

Accommodation and amenity inventory, admin rule profiles with date sets and override behaviour,
availability and price resolution, the public enquiry flow with WhatsApp OTP, admin enquiry
management, the admin availability calendar, versioned Terms & Conditions, price snapshots, and
rule/audit history.

### Out of scope

Halls and grounds (PRD §50, future). Online payment, customer accounts, membership pricing,
coupons, deposits, bed-level dormitory booking, multiple Bhavan locations (PRD §49, §50).

### Decisions taken during design

| Decision | Choice | Rationale |
|---|---|---|
| Governing document | `bhavan-booking-enquiry-system-prd.md` | Newest and most detailed; explicitly drops login + payment |
| Delivery | Full PRD "Must Have" in one build, phased plan | The rule engine is the point of the module; a version without it would be rebuilt |
| Inventory granularity | Count by accommodation type; track individual units for admin | Matches PRD §4.1 ("optionally have individual unit numbers"); keeps dormitories consistent with §4.2 |
| Inventory holds | Only `APPROVED` enquiries (and admin manual entries) reduce public availability | An enquiry is a request, not a claim; immune to spam blocking inventory |
| Rule storage | Rule profiles + dated assignments, resolved on read | Override is `ORDER BY applied_at`; per-day rows make "remove one date" a single delete (PRD §8.1) |

### Assumptions

1. Everyone completes OTP verification, including logged-in members — PRD §55 states the rule
   unconditionally. Logged-in users get their form fields pre-filled but are not exempt.
2. Schema follows the repository's existing pattern: models imported at startup into
   `Base.metadata.create_all`, plus idempotent `ALTER TABLE` statements in `main.py` for changes to
   pre-existing tables. A matching Alembic revision is added for parity with `alembic/versions/`.
3. All tables are prefixed `bhavan_`. The live database still carries the old `rooms`, `bookings`,
   `vouchers` and `special_events` tables (models deleted, tables never dropped); prefixing avoids
   any collision.

---

## 2. Architecture

Three layers, each independently testable:

```
                    ┌──────────────────────────────────────┐
 PUBLIC             │  routers/bhavan.py                   │  no auth
 /bhavan/*          │  config · availability · quote       │
                    │  terms · otp · submit enquiry        │
                    └───────────────┬──────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────┐
                    │  services/bhavan_quote.py            │  pricing + inventory
                    │  build_quote() → lines, total,       │
                    │                  blockers[]          │
                    └───────────────┬──────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────┐
                    │  services/bhavan_rules.py  ★         │  pure — no I/O
                    │  resolve_range(dates) → DayState[]   │
                    └───────────────▲──────────────────────┘
                                    │
 ADMIN              ┌───────────────┴──────────────────────┐
 /admin/bhavan/*    │  routers/bhavan_admin.py             │  get_current_admin
                    │  inventory · rules · calendar        │
                    │  enquiries · terms · audit           │
                    └──────────────────────────────────────┘
```

**`services/bhavan_rules.py` takes no database session.** It receives already-loaded assignment
records and returns resolved day state. The entire override, pricing and condition matrix is
therefore testable as a table of pure inputs and expected outputs, with no fixtures and no
database.

The admin calendar and the public quote endpoint call the **same** resolver. They cannot disagree
about what a date means.

### Module responsibilities

| Module | Does | Depends on |
|---|---|---|
| `services/bhavan_rules.py` | Layer assignments into effective `DayState` per date | Nothing (pure) |
| `services/bhavan_availability.py` | Count committed vs. available units per type per night | DB, `bhavan_rules` |
| `services/bhavan_quote.py` | Build line items, totals, and customer-safe blockers | `bhavan_rules`, `bhavan_availability` |
| `services/bhavan_otp.py` | Issue/verify enquiry OTPs, mint the verification token | `otp_delivery`, `PhoneOTPRequest` |
| `routers/bhavan.py` | Public HTTP surface, public-only response models | quote, otp |
| `routers/bhavan_admin.py` | Admin CRUD, calendar, enquiry management, audit writes | all services |

---

## 3. Data model

### 3.1 Inventory

**`bhavan_accommodation_types`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | String(200) | "AC Room", "Non-AC Dormitory" — admin-editable, not hard-coded |
| `kind` | Enum | `room` \| `dormitory` |
| `description` | Text | |
| `capacity_per_unit` | Integer | |
| `base_price_per_night` | Numeric(10,2) | The PRD §47 "Normal Day" rate |
| `sort_order` | Integer | |
| `is_active` | Boolean | |

**`bhavan_accommodation_images`** — a gallery per type, uploaded (not URLs).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `accommodation_type_id` | UUID FK | cascade delete |
| `path` | String(500) | Server-relative, e.g. `/uploads/bhavan/<uuid>.jpg` |
| `sort_order` | Integer | First image is the card thumbnail |

**`bhavan_units`** — individual rooms/dormitories. **Availability count for a type = number of its
units with `status = available`.**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `accommodation_type_id` | UUID FK | |
| `label` | String(50) | "101", "Dorm A" |
| `capacity` | Integer, nullable | Overrides the type's `capacity_per_unit` when set |
| `status` | Enum | `available` \| `maintenance` \| `inactive` |
| `notes` | String(500) | |

Admin gets a bulk-create action ("add 12 units numbered 101–112") so setup does not mean twelve
form submissions.

**`bhavan_amenities`** — PRD §5. Pricing type varies per amenity: some are charged per unit
(chairs), some per day (coolers), some per booking or as a one-time charge.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | String(200) | |
| `description` | Text | |
| `image_path` | String(500), nullable | Uploaded |
| `price` | Numeric(10,2) | |
| `pricing_type` | Enum | `per_unit` \| `per_day` \| `per_night` \| `per_booking` \| `one_time` |
| `available_quantity` | Integer, nullable | `null` = unlimited |
| `allow_over_request` | Boolean | PRD §5: block over-requesting unless admin permits it |
| `is_active` | Boolean | |
| `sort_order` | Integer | |

Charge formulas, applied in `bhavan_quote`:

| `pricing_type` | Line total |
|---|---|
| `per_unit` | `price × quantity` |
| `per_day` | `price × quantity × days` |
| `per_night` | `price × quantity × nights` |
| `per_booking` | `price` (quantity ignored) |
| `one_time` | `price` (quantity ignored) |

`nights = (check_out - check_in).days`; `days = nights + 1`, the count of calendar days the guest
is present including the departure day. `per_day` and `per_night` are deliberately distinct — a
20→22 Dec stay is 2 nights but 3 days. The quote line states the multiplier it used
("Cooler × 2 · 3 days · ₹500 = ₹3,000") and the admin amenity form shows the same worked example,
so the difference is never something anyone has to infer.

**`bhavan_booking_purposes`** — PRD §26. `id`, `name`, `is_active`, `sort_order`. Admin can add,
rename and deactivate.

**`bhavan_settings`** — singleton row holding global defaults: `default_min_nights`,
`default_max_nights`, `advance_booking_days`, `otp_ttl_seconds`, `otp_resend_cooldown_seconds`,
`otp_max_attempts`, and a `required_fields` JSON marking which customer fields are mandatory
(PRD §30).

### 3.2 Rule engine

**`bhavan_rule_profiles`** — the reusable configuration (PRD §9, §46).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | String(200) | "Wedding", "Maintenance" — internal, never shown to customers |
| `category` | Enum | `event` \| `pricing` \| `discount` \| `closure` \| `custom` |
| `description` | Text | |
| `config` | JSON | Validated by a Pydantic model on write — see §3.3 |
| `status` | Enum | `active` \| `inactive` \| `archived` |
| `is_template` | Boolean | Templates are copy-from sources, never applied directly |
| `created_by` / `updated_by` | UUID FK users | |

**`bhavan_rule_assignments`** — a profile applied to a named set of dates.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `profile_id` | UUID FK | |
| `label` | String(200) | The date-set name, e.g. "Wedding Dates 2027" (PRD §8) |
| `config_snapshot` | JSON | The profile's `config` frozen at apply time |
| `applied_at` | DateTime(tz) | **The priority key** — newer wins (PRD §19/§21) |
| `applied_by` | UUID FK users | |
| `is_active` | Boolean | |
| `revoked_at` / `revoked_by` | nullable | Revoked, never deleted (PRD §20) |
| `note` | String(500) | Admin's reason for the change |

`config_snapshot` is why editing a profile cannot retroactively change how a past date was priced
or what a submitted enquiry cost.

**`bhavan_rule_assignment_dates`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `assignment_id` | UUID FK | cascade delete |
| `date` | Date | **Indexed** |
| | | `UNIQUE(assignment_id, date)` |

Dates are expanded to one row per calendar day. A year-long rule is 365 small rows, which is
irrelevant at this scale, and it buys two things the PRD asks for repeatedly: "which rules apply to
15 Dec" is one indexed query, and "remove 15 Dec from this rule" (§8.1) is one delete rather than a
range split.

### 3.3 Rule config schema

A JSON column rather than thirty typed columns, because PRD §10 requires supporting *"future rule
types without requiring a complete redesign"*. It is validated by a Pydantic model on every write,
so it is typed where correctness matters.

```jsonc
{
  "availability": {
    "closed": false,                                  // true = nothing bookable (Maintenance)
    "default_accommodation": "allowed",               // fallback for types not listed
    "accommodation": { "<type_id>": "allowed" | "blocked" },
    "default_amenities": "allowed",
    "amenities": { "<amenity_id>": "allowed" | "blocked" }
  },
  "pricing": {
    "mode": "none" | "fixed" | "increase_percent" | "increase_amount"
          | "discount_percent" | "discount_amount",
    "value": 50,
    "per_type": { "<type_id>": { "mode": "fixed", "value": 3000 } },  // overrides `mode` for a type
    "conflict_behaviour": "replace_base" | "adjust_current"           // PRD §25
  },
  "conditions": {
    "min_nights": 2, "max_nights": null,
    "min_units": 2,  "max_units": null,
    "min_guests": null, "max_guests": null,
    "advance_days": null
  },
  "purposes": {
    "default": "allowed" | "blocked",
    "allowed": ["<purpose_id>"],
    "blocked": ["<purpose_id>"]
  },
  "public_message": null    // optional admin-authored text — the ONLY rule content a customer may see
}
```

Every field is optional. A field that is absent means "this rule does not express an opinion", and
the value from the previous layer survives. This is what makes a pure discount rule (Social Event:
15% off, nothing else) composable with a pricing rule underneath it.

### 3.4 Enquiries

**`bhavan_enquiries`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `reference` | String(20) unique | `BV-2027-00125` (PRD §34) |
| `check_in` / `check_out` | Date | `check_out > check_in` enforced |
| `nights` | Integer | Denormalised for reporting |
| `purpose_id` | UUID FK, nullable | |
| `purpose_name` | String(200) | Snapshot |
| `full_name`, `mobile`, `whatsapp_number`, `email`, `address`, `city`, `state` | | PRD §30 |
| `guests_total`, `adults`, `children` | Integer | |
| `special_requirements`, `message` | Text | |
| `status` | Enum | `pending` \| `under_review` \| `approved` \| `rejected` \| `cancelled` \| `completed` \| `expired` |
| `source` | Enum | `online` \| `phone` \| `walk_in` \| `admin` (PRD §37) |
| `mobile_verified` | Boolean | |
| `verified_at` | DateTime(tz) | |
| `terms_version_id` | UUID FK | |
| `terms_accepted` / `terms_accepted_at` | | PRD §34 |
| `quote_snapshot` | JSON | Full computed breakdown at submit time |
| `rules_snapshot` | JSON | Effective assignment ids/labels per date — **admin-only** |
| `estimated_total` | Numeric(10,2) | |
| `user_id` | UUID FK, nullable | Set when a logged-in member submitted |
| `created_by` | UUID FK, nullable | The admin, for manual entries |
| `reviewed_by` / `reviewed_at` / `decision_reason` | | |

**`bhavan_enquiry_accommodations`** — `enquiry_id`, `accommodation_type_id`, `type_name_snapshot`,
`quantity`, `nights`, `unit_price_snapshot`, `line_total`.

**`bhavan_enquiry_amenities`** — `enquiry_id`, `amenity_id`, `name_snapshot`,
`pricing_type_snapshot`, `quantity`, `unit_price_snapshot`, `line_total`.

**`bhavan_enquiry_notes`** — `enquiry_id`, `admin_id`, `note`, `created_at` (PRD §36).

### Status lifecycle

```
              ┌──────────────► rejected
              │
 pending ──► under_review ──► approved ──► completed
    │                             │
    └──────────────────────────► cancelled
    │
    └──► expired
```

`pending`, `under_review`, `approved`, `rejected` and `cancelled` are set by admin action. The two
time-driven statuses are derived by a sweep that runs on admin enquiry-list reads, so the module
carries no cron dependency:

- **`expired`** — still `pending` or `under_review` after its `check_in` date has passed.
- **`completed`** — `approved` and its `check_out` date has passed.

Expired enquiries hold no inventory, having never been approved. Completed ones stop holding it,
since their dates are in the past.

**`bhavan_terms_versions`** — `version_label` ("v2.1"), `content` (markdown), `is_published`,
`published_at`, `published_by`. Exactly one row may be published; publishing a new version
unpublishes the previous one inside the same transaction.

Every name, price and rule an enquiry depended on is **copied into the enquiry at submit time**.
Later edits to rates, amenities, rules or Terms cannot alter a historical enquiry (PRD §41, §55).

### 3.5 Reused, not rebuilt

- **`AuditLog`** (`models/audit.py`) already carries `admin_id`, `action`, `target_table`,
  `target_id`, `old_value`, `new_value`, `timestamp`. Every Bhavan admin mutation writes one.
- **`PhoneOTPRequest`** (`models/user.py`) already has hashed OTP, expiry, attempt counter and
  verified flag. One `ALTER TABLE` adds `purpose VARCHAR(40) DEFAULT 'generic'`.
- **`otp_delivery.send_otp_message`** already sends WhatsApp-first with SMS fallback and reports
  the channel that carried the code.
- **Upload convention**: multipart endpoint writes to `uploads/<category>/<uuid>.<ext>` and returns
  a server-relative path; the frontend renders it through `utils/media.ts` `mediaUrl()`. Bhavan
  images use `uploads/bhavan/`.

---

## 4. Rule resolution

For each date, start from system defaults and layer applicable assignments **oldest first**, so the
most recently applied assignment lands on top:

```
15 Dec  defaults:  all active types allowed · base prices · min_nights 1 · all purposes allowed
        ↓ Assignment #1 "Wedding"      applied 11 Aug 10:00
        ↓ Assignment #2 "Maintenance"  applied 11 Aug 10:05
        = closed · nothing bookable
```

This is PRD §19 exactly: 10–14 Dec resolve to Wedding, 15 Dec to Maintenance, 16–20 Dec back to
Wedding. The Wedding assignment is untouched; it simply loses on one date.

### Layering rules

| Aspect | Merge behaviour |
|---|---|
| **Availability** | Each layer's explicit `allowed`/`blocked` entries overwrite that type's state. `closed: true` blocks everything regardless of per-type entries. Selective blocking (§16) and selective availability (§17) both fall out of this. |
| **Pricing** | `replace_base` computes from the type's `base_price_per_night`, discarding earlier pricing layers. `adjust_current` compounds on the running effective price. This is the §25 conflict knob: a Wedding rate of ₹3,000 plus a 20% `adjust_current` discount yields ₹2,400. |
| **Conditions** | Per field. The most recent layer that *specifies* `min_nights` wins `min_nights`; a layer that omits it leaves the earlier value standing. |
| **Purposes** | The most recent layer that specifies purpose rules wins them outright. |

### `DayState`

```python
@dataclass(frozen=True)
class DayState:
    date: date
    closed: bool
    accommodation: dict[UUID, TypeState]   # allowed, effective_price
    amenities: dict[UUID, bool]            # allowed
    conditions: Conditions
    allowed_purpose_ids: frozenset[UUID] | None   # None = all allowed
    public_message: str | None
    source_assignment_ids: tuple[UUID, ...]       # ADMIN ONLY — never serialised publicly
```

`source_assignment_ids` powers the admin's "why does this date behave this way?" panel (PRD §20)
and is stripped from every public response.

### Multi-night stays

A stay spans several dates that may resolve differently. Rules:

- **Availability**: a type is bookable only if it is allowed on *every* night of the stay.
- **Pricing**: charged per night at that night's effective price, then summed. A 20–22 Dec stay
  where 20 Dec is a Wedding night and 21 Dec is normal is billed at the two different rates.
- **Conditions**: the strictest value across the stay's nights applies — `max(min_nights)`,
  `max(min_units)`, `min(max_units)`.
- **Purposes**: a purpose must be allowed on every night.
- **Closure**: any closed night blocks the whole stay.

---

## 5. Booking calculation

```
  accommodation charges   Σ over nights, types: qty × effective_price_that_night
+ amenity charges         per the pricing_type formula table in §3.1
- discounts               from rules with a discount pricing mode
+ surcharges              from rules with an increase pricing mode
= Estimated Booking Amount
```

Discounts and surcharges are already folded into each night's effective price by the resolver;
the quote reports them as separate display lines so the customer sees a comprehensible breakdown
without seeing rule internals (PRD §23). The customer-facing wording is **"Estimated Booking
Amount"**, never a confirmed price.

### Availability counting

For a night `d` and accommodation type `t`:

```
capacity(t)      = count of bhavan_units where type = t and status = 'available'
committed(t, d)  = Σ quantity from bhavan_enquiry_accommodations
                   joined to enquiries with status = 'approved'
                   and check_in <= d < check_out
available(t, d)  = capacity(t) - committed(t, d)      # never negative
```

Only `approved` enquiries hold inventory. Pending enquiries never block anyone; admin sees a
demand count ("3 pending requests competing for 20 Dec") on the enquiry list and calendar. Admin
manual entries hold inventory because admin creates them as approved (PRD §37).

Amenities are counted the same way against their `available_quantity`, summed over approved
enquiries whose stay overlaps the night. A `null` `available_quantity` means unlimited and skips
the check; `allow_over_request` lets the admin permit a request beyond stock, which is then
flagged on the enquiry for the admin rather than blocked (PRD §5).

The submit endpoint re-checks availability inside the transaction. Approval re-checks it too, and
refuses to approve past capacity — this is the "no negative inventory" guarantee of PRD §55.

### Guest capacity

The combined capacity of the selected accommodation (per unit capacity × quantity, summed) must be
at least `guests_total`. Falling short is a blocker, reported as *"The selected accommodation holds
up to 8 guests. Please select more units or reduce the guest count."*

---

## 6. Public flow

Routes: `/bhavan` → `/bhavan/booking` → `/bhavan/enquiry/success`, plus
`/bhavan/terms-and-conditions` (opens in a new tab from the booking page, PRD §32).

```
Dates + Purpose → Accommodation → Amenities → Your details
                                                    ↓
              Success ← Submit ← Review + accept T&C ← Verify mobile (WhatsApp OTP)
```

Each step re-runs `POST /bhavan/quote`, so the running estimate stays live and blockers surface at
the earliest step where they are knowable — a minimum-stay violation is reported on the dates step,
not after the customer has filled in a form.

`/bhavan` (the landing page) shows accommodation cards with uploaded photos, capacity, description
and a "from ₹X / night" figure, the amenities list, and a CTA into the booking flow. It is
public-visible information only, per PRD §9.4.

### OTP and its binding to submission

Verifying returns a **15-minute signed JWT** with claims `{phone, purpose: "bhavan_enquiry"}`,
using the existing `jose` / `SECRET_KEY` setup. `POST /bhavan/enquiries` requires that token and
rejects the request if its phone does not match the enquiry's mobile number.

Without this binding, a caller verifies their own number and then submits an enquiry carrying a
stranger's details — the verification would prove nothing about the enquiry it is attached to.

The `purpose` column added to `phone_otp_requests` ensures a *login* OTP can never satisfy a Bhavan
enquiry and vice versa. Expiry, resend cooldown, and max attempts come from `bhavan_settings`;
rate limiting is per phone number and per IP.

### API surface (public)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/bhavan/config` | Accommodation types (with images), amenities, purposes, settings needed by the form |
| POST | `/api/v1/bhavan/availability` | `{check_in, check_out, purpose_id}` → per-type availability, effective price, blockers |
| POST | `/api/v1/bhavan/quote` | Full selection → line items, estimated total, blockers |
| GET | `/api/v1/bhavan/terms` | The published Terms version |
| POST | `/api/v1/bhavan/otp/request` | Rate-limited; delivers via WhatsApp with SMS fallback |
| POST | `/api/v1/bhavan/otp/verify` | Returns the verification token |
| POST | `/api/v1/bhavan/enquiries` | Submit; returns the reference number |

---

## 7. Admin

Routes under `/admin/bhavan`: overview, `enquiries`, `calendar`, `accommodation`, `amenities`,
`rules` (+ `rules/create`), `terms`, `audit-log`. A "Bhavan" entry is added to the sidebar in
`admin/layout.tsx` (gated like the other permissioned items), and "Bhavan" is added to the public
`Navbar`.

**Overview** (PRD §43): pending enquiries, today's enquiries, upcoming enquiries, approved
enquiries, available accommodation, blocked dates, active rules.

**Calendar** (PRD §38) shows the *effective* state per date — the winning rule's name and a status
colour — not a list of historical rules. Clicking a date opens a panel showing the full layer
stack: every applicable assignment in `applied_at` order, which one won each aspect, who applied it
and when. This is the PRD §20 "why does this date behave this way?" requirement.

**Rule creation** (PRD §45) is the interaction that matters most. The date picker is a multi-month
grid supporting click-a-single-day, drag-a-range, several disjoint ranges, and removal of
individual dates from an existing assignment — the full PRD §8.1 list. Because dates are stored one
row per day, removing 15 Dec from a 10–20 Dec assignment is one delete, not a range split.

**Enquiry management** (PRD §36): list with search and filters by date and status, detail view with
the full snapshot, internal notes, status transitions, and manual enquiry creation with a `source`
of phone / walk-in / admin.

**Terms** (PRD §33): view current, edit as markdown (reusing the `@uiw/react-md-editor` already in
the project for blogs), preview, publish, and version history.

Every mutation writes an `AuditLog` row with the old and new value (PRD §42).

---

## 8. Privacy and customer-facing messages

Public and admin responses use **separate Pydantic models**. The public models simply have no field
for rule names, rule ids, priority, timestamps, admin notes or pricing formulas — leakage is
prevented by the type, not by remembering to filter (PRD §28, §55).

Internal blockers pass through a `to_public_message()` mapper (PRD §48):

| Internal state | Customer sees |
|---|---|
| `closed: true` / all inventory blocked | The Bhavan is unavailable for the selected dates. |
| `min_nights = 2` violated | A minimum stay of 2 nights is required for the selected dates. |
| Selected purpose blocked | This type of event is not available for the selected dates. |
| `min_units = 2` violated | A minimum of 2 units must be booked for the selected dates. |
| Requested quantity exceeds availability | Only 2 AC Rooms are available for the selected dates. |

A rule's `public_message`, when the admin sets one, is the single exception — it is admin-authored
text intended for customers.

### Data integrity guarantees (PRD §55)

Enforced by constraint where possible and by test in every case: check-out after check-in; no
negative inventory; inactive and revoked rules excluded from new enquiries; historical enquiry
prices immutable; accepted Terms version retained per enquiry; overridden assignments retained in
history; admin changes audited; OTPs expire; OTP attempts rate-limited; no submission without
verification; no submission without accepting the current published Terms.

---

## 9. Testing

| File | Covers |
|---|---|
| `backend/tests/test_bhavan_rules.py` | Table-driven resolver cases: override ordering, selective blocking, full closure, all six pricing modes, both conflict behaviours, per-field condition merging, purpose gating, multi-night strictest-wins. **No DB, no fixtures.** |
| `backend/tests/test_bhavan_quote.py` | Line items per amenity pricing type, multi-rate stays, discounts and surcharges, availability counting against approved enquiries, no-negative-inventory |
| `backend/tests/test_bhavan_enquiry.py` | Submit rejected without a verification token, on phone mismatch, on expired token, without terms acceptance. **Snapshot immutability**: change rates and rules after submit, assert the stored enquiry is unchanged |
| `backend/tests/test_bhavan_public_leakage.py` | Asserts no internal rule key (`rule`, `assignment`, `applied_at`, `priority`, `profile`, `snapshot`) appears anywhere in any public response body |
| `backend/tests/test_bhavan_admin.py` | Admin auth gating, audit rows written on mutation, terms publish transitions, manual enquiry affects availability |
| `frontend/src/app/(public)/bhavan/booking/quoteState.test.ts` | Booking stepper reducer: step gating, date validation, quantity clamping |

The PRD §39 rule-conflict example and the §53 end-to-end scenario are both encoded as explicit test
cases, since they are the requirements' own statement of correct behaviour.

---

## 10. Build sequence

Ordered so each phase is verifiable before the next depends on it.

1. **Models + migration** — all `bhavan_*` tables, the `phone_otp_requests.purpose` ALTER,
   registration in `models/__init__.py` and `main.py`, Alembic revision.
2. **Rule resolver** — `services/bhavan_rules.py` with its full test table. Pure, no HTTP, no DB.
3. **Availability + quote** — `services/bhavan_availability.py`, `services/bhavan_quote.py`, tests.
4. **Admin inventory API + UI** — accommodation types with image upload, units with bulk create,
   amenities, purposes, settings.
5. **Admin rules API + UI** — profiles, templates, assignments, the multi-date picker, calendar with
   the layer-stack panel.
6. **Terms** — versioning API, admin markdown editor, public page.
7. **Public flow** — config/availability/quote endpoints, the booking stepper, OTP endpoints and
   verification token.
8. **Enquiry submission** — submit endpoint with snapshots, success page, reference generation.
9. **Admin enquiry management** — list, filters, detail, notes, status transitions, manual entry.
10. **Overview dashboard + audit log view**, navigation entries, seed script.

`scripts/seed_bhavan.py` seeds the four accommodation types from PRD §4, sample amenities across
the different pricing types, the eight purposes from §26, and the six rule **templates** (Wedding,
Social Event, Anniversary, Camp, Festival, Maintenance) as inactive copy-from sources — so the
admin starts from examples rather than a blank slate. Per PRD §57 these are only starting points:
the admin defines what Wedding means.
