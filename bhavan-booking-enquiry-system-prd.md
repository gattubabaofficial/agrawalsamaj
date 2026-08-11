# Bhavan Booking Enquiry System — Product Requirements Document

## 1. Product Overview

The Bhavan Booking Enquiry System is a booking/enquiry module inside an existing website.

It is **not a complete hotel booking marketplace** and does not require customer accounts or online payments.

The public user can:

1. Select booking dates.
2. Select accommodation types.
3. Select additional amenities.
4. Enter enquiry/customer details.
5. Verify their mobile number using a WhatsApp OTP.
6. Review the estimated booking amount.
7. Read and accept the Terms & Conditions.
8. Submit a booking enquiry.

The admin has complete control over:

- Accommodation inventory
- Amenities
- Pricing
- Discounts
- Event types
- Booking rules
- Date-specific rules
- Multiple date sets
- Availability restrictions
- Minimum/maximum booking conditions
- Terms & Conditions
- Enquiry approval/rejection
- Manual bookings
- Rule history and overrides

The central concept is a **configurable rule engine**. Admin users should be able to change how the Bhavan behaves without requiring code changes.

---

# 2. Goals

## Primary Goals

- Provide a simple public Bhavan booking enquiry experience.
- Allow customers to submit enquiries without creating an account.
- Verify the customer's mobile number through WhatsApp OTP.
- Allow administrators to define complex booking rules themselves.
- Allow one rule to be applied to multiple non-contiguous dates.
- Support wedding dates, social events, anniversaries, camps, festivals, maintenance periods, and custom events.
- Allow different prices on different dates without exposing internal pricing rules.
- Allow discounts for selected booking/event types.
- Allow new rules to override older rules when dates overlap.
- Keep an audit/history of rule changes.
- Allow the admin to edit the Terms & Conditions shown to customers.
- Treat every public submission as an enquiry/request rather than an automatic confirmed booking.

## Non-Goals

The initial version does not require:

- Customer login/account creation
- Online payment gateway
- Customer wallet
- Automatic final booking confirmation
- Customer loyalty system
- Hotel marketplace functionality

---

# 3. User Roles

## 3.1 Public Customer

The customer does not need an account.

The customer can:

- Check dates.
- Select accommodation.
- Select amenities.
- Enter personal/enquiry information.
- Verify WhatsApp OTP.
- Read Terms & Conditions.
- Submit an enquiry.
- Receive an enquiry/booking reference number.

## 3.2 Admin

Admin has complete management access.

Admin can:

- Manage accommodation.
- Manage amenities.
- Manage prices.
- Create/edit/delete/deactivate rules.
- Assign rules to dates.
- Manage multiple date sets.
- Block availability.
- Manage enquiries.
- Create manual bookings/enquiries.
- Edit Terms & Conditions.
- View rule history.
- View audit logs.

## 3.3 Optional Manager Role

The system may support a manager role later.

Permissions can be restricted so that a manager can manage enquiries and availability without being allowed to change pricing or core rules.

---

# 4. Accommodation

The initial accommodation types are:

1. AC Room
2. Non-AC Room
3. AC Dormitory
4. Non-AC Dormitory

These should be configurable rather than hard-coded.

Admin should be able to:

- Create accommodation types.
- Rename them.
- Activate/deactivate them.
- Set capacity.
- Set descriptions.
- Set base prices.
- Configure availability.
- Add individual units where required.

## 4.1 Rooms

Rooms can optionally have individual unit numbers.

Example:

- Room 101
- Room 102
- Room 103

Each unit can have:

- Unit number
- Accommodation type
- Capacity
- Status
- Maintenance status
- Active/inactive state

## 4.2 Dormitories

Dormitories can initially be booked as complete units rather than individual beds.

Each dormitory can have:

- Name/number
- Accommodation type
- Capacity
- Status
- Active/inactive state

The architecture should allow bed-level booking in a future version if required.

---

# 5. Amenities / Additional Facilities

Amenities are configurable resources.

Examples:

- Chairs
- Coolers
- Tables
- Mattresses
- Blankets
- Other facilities

Admin can configure:

- Name
- Description
- Price
- Pricing type
- Available quantity
- Active/inactive status

## 5.1 Pricing Types

An amenity can use:

- Per unit
- Per day
- Per night
- Per booking
- One-time charge

Example:

```text
Plastic Chair
₹10 / chair

Cooler
₹500 / day

Table
₹100 / table
```

Availability must prevent the customer from requesting more quantity than the admin has configured as available, unless the admin explicitly allows over-requesting.

---

# 6. Booking Enquiry Flow

The public flow should be simple and should not require login.

```text
Select Dates
      ↓
Check Rules & Availability
      ↓
Select Accommodation
      ↓
Select Amenities
      ↓
Enter Customer / Event Details
      ↓
WhatsApp OTP Verification
      ↓
Review Enquiry
      ↓
Read Terms & Conditions
      ↓
Accept Terms
      ↓
Submit Enquiry
      ↓
Generate Enquiry Number
      ↓
Admin Receives Enquiry
```

The public system should clearly communicate that submitting an enquiry does **not automatically confirm the booking**.

---

# 7. Date Selection

The public user selects:

- Check-in date
- Check-out date

The system evaluates all applicable rules for the selected period.

The admin calendar must support much more advanced date management.

---

# 8. Admin Date Sets

A major requirement is the ability to apply one rule to multiple separate dates.

For example, the admin may know all wedding dates at the beginning of the year.

Instead of creating one rule for every date, admin can create:

```text
Wedding Dates 2027

05 Jan 2027
12 Jan 2027
18 Jan 2027
19 Jan 2027
25 Jan 2027
02 Feb 2027 - 05 Feb 2027
15 Feb 2027
```

All of these dates can belong to one date set.

## 8.1 Date Selection Methods

Admin should be able to:

- Click individual dates.
- Select a date range.
- Add multiple ranges.
- Add individual dates.
- Remove selected dates.
- Add dates to an existing rule.
- Remove dates from an existing rule.
- Optionally paste/import a list of dates in a future version.

---

# 9. Bhavan Rule Profiles

The admin should create reusable rule profiles.

Example predefined profiles:

- Normal Day
- Wedding
- Social Event
- Anniversary
- Camp
- Festival
- Maintenance
- Custom Event

These profiles are internal administrative configurations.

The customer should not see the internal rule name or internal rule configuration unless the admin intentionally chooses to expose some customer-facing information.

---

# 10. Rule Profile Configuration

Each rule profile can control multiple parts of the booking system.

A rule may define:

### Availability

- Accommodation allowed
- Accommodation blocked
- Amenities allowed
- Amenities blocked
- Complete Bhavan closure

### Pricing

- Fixed price
- Percentage increase
- Fixed amount increase
- Percentage discount
- Fixed amount discount
- Replace existing rate
- Apply adjustment to existing rate

### Booking Conditions

- Minimum stay
- Maximum stay
- Minimum accommodation units
- Maximum accommodation units
- Minimum guests
- Maximum guests
- Advance booking requirement

### Booking/Event Purpose

- Wedding allowed
- Social event allowed
- Anniversary allowed
- Camp allowed
- Festival allowed
- Other custom purposes

### Custom Restrictions

The system should support future rule types without requiring a complete redesign.

---

# 11. Wedding Rule Example

A Wedding rule may be configured as:

```text
Rule Name:
Wedding

Dates:
Admin-selected dates

Accommodation:
AC Room: Allowed/Blocked
Non-AC Room: Allowed/Blocked
AC Dormitory: Allowed/Blocked
Non-AC Dormitory: Allowed/Blocked

Pricing:
Special wedding rates

Minimum Stay:
2 nights

Minimum Units:
2

Social Event:
Not allowed

Anniversary:
Not allowed

Camp:
Not allowed
```

The exact configuration must be controlled by the admin.

The system must not assume these values permanently.

---

# 12. Social Event Rule Example

A Social Event rule may be:

```text
Accommodation:
Allowed

Pricing:
Normal rate

Discount:
15%

Minimum Stay:
1 night

Other Restrictions:
None
```

The percentage and restrictions are editable by the admin.

---

# 13. Anniversary Rule Example

Example:

```text
Accommodation:
Allowed

Discount:
10%

Minimum Stay:
1 night
```

Again, all values are editable.

---

# 14. Camp Rule Example

Example:

```text
Rooms:
Blocked

Dormitories:
Allowed

Discount:
20%

Minimum Stay:
3 nights
```

The admin can modify the configuration.

---

# 15. Maintenance Rule

Maintenance is a special operational rule.

Example:

```text
Rule Name:
Maintenance

Availability:
Nothing bookable

AC Rooms:
Blocked

Non-AC Rooms:
Blocked

AC Dormitories:
Blocked

Non-AC Dormitories:
Blocked

Amenities:
Blocked
```

The system should display only a simple customer-facing message such as:

> The Bhavan is unavailable for the selected dates.

Internal maintenance details are not required to be shown publicly.

---

# 16. Selective Blocking

Rules must not always apply to the entire Bhavan.

For example:

```text
Maintenance Rule

AC Room: Blocked
Non-AC Room: Blocked
AC Dormitory: Allowed
Non-AC Dormitory: Allowed
```

This allows admin to close only specific accommodation categories.

---

# 17. Selective Availability

The system must also support:

```text
Only these can be booked:
AC Room
AC Dormitory
```

while:

```text
Non-AC Room
Non-AC Dormitory
```

are blocked.

---

# 18. Rule Assignment to Dates

The admin workflow should be:

```text
Create / Select Rule
        ↓
Open Calendar
        ↓
Select one or multiple dates/ranges
        ↓
Apply Rule
        ↓
Save
```

Example:

```text
Rule:
Wedding

Dates:
05 Jan
12 Jan - 14 Jan
20 Jan
02 Feb - 05 Feb

[Apply Rule]
```

---

# 19. Rule Precedence / Override System

This is one of the most important requirements.

When multiple rules apply to the same date, the **newer applicable rule overrides the older applicable rule for conflicting availability/restriction settings**.

Example:

### 10:00 AM

```text
Wedding
10 Dec - 20 Dec
```

### 10:05 AM

```text
Maintenance
15 Dec
```

Effective result:

```text
10-14 Dec → Wedding
15 Dec → Maintenance
16-20 Dec → Wedding
```

The older Wedding rule is not deleted.

It remains in history but is overridden for 15 Dec.

---

# 20. Rule Versioning and History

Rules should never be physically destroyed just because a newer rule overrides them.

Each rule assignment/version should retain:

- Created date/time
- Created by
- Modified date/time
- Modified by
- Original configuration
- New configuration
- Override status
- Effective dates

Admin should be able to see why a particular date currently behaves in a certain way.

---

# 21. Availability Rule Priority

For availability/restriction conflicts:

```text
Newest applicable rule
        ↓
Overrides older applicable rule
```

Example:

```text
Wedding
↓
Maintenance
↓
Maintenance wins
```

This should be predictable and visible to admin.

---

# 22. Pricing Rule Behaviour

Pricing needs separate handling from availability.

A pricing rule can be configured as:

```text
Fixed Price
Increase by %
Increase by Amount
Discount by %
Discount by Amount
Replace Existing Price
Adjust Existing Price
```

Example:

```text
Normal AC Room:
₹1,500

Wedding:
+50%

Effective:
₹2,250
```

Or:

```text
Wedding AC Room:
₹3,000 fixed
```

---

# 23. Customer-Facing Pricing

Internal pricing logic must not be exposed.

For example, if:

```text
Normal price = ₹1,500
Wedding price = ₹3,000
```

the customer can simply see:

```text
AC Room
₹3,000 / night
```

The customer does not need to see:

```text
Wedding surcharge = ₹1,500
```

unless the admin specifically chooses to display such information.

For enquiries, use the wording:

> **Estimated Booking Amount**

rather than claiming that the amount is a final confirmed price.

---

# 24. Discount Handling

Discount rules can apply based on:

- Event type
- Date
- Rule profile
- Accommodation type
- Other admin-defined conditions

Examples:

```text
Social Event → 15% discount

Anniversary → 10% discount

Camp → 20% discount
```

Discount values must be editable.

---

# 25. Pricing Rule Conflicts

When a new rule overlaps an older pricing rule, the admin should configure how the new rule behaves.

Possible behaviours:

```text
Replace previous price
Apply discount to previous price
Add to previous price
Subtract from previous price
```

Example:

```text
Wedding rate:
₹3,000

Social discount:
20%

If configured as discount-on-current-rate:

₹3,000 - 20%
= ₹2,400
```

The exact behaviour is controlled by the rule configuration.

---

# 26. Booking Purpose

The customer should be able to select the purpose of the enquiry.

Example:

```text
Purpose:

Wedding
Social Event
Anniversary
Camp
Family Function
Religious Event
Community Event
Other
```

The admin should be able to:

- Add purposes
- Rename purposes
- Deactivate purposes

The purpose can be used by the rule engine to determine applicable discounts/restrictions.

---

# 27. Important distinction: Date Rules vs Booking Purpose

A date rule can control what happens on a date.

A booking purpose describes what the customer wants to do.

Example:

```text
Date:
15 December

Active Date Rule:
Wedding
```

Customer selects:

```text
Purpose:
Social Event
```

If the Wedding rule says Social Events are not allowed, the system prevents the enquiry from proceeding.

The customer receives a simple message:

> The selected dates are not available for this type of event.

The internal rule configuration remains private.

---

# 28. Public Customer Information

The customer can see:

- Available dates
- Available accommodation
- Effective prices
- Available amenities
- Estimated total
- Basic booking conditions necessary to complete the enquiry
- Terms & Conditions

The customer should not see:

- Internal rule names
- Rule priority
- Rule creation time
- Admin notes
- Internal pricing formulas
- Internal rule history
- Admin-only restrictions that do not need to be disclosed
- Other customers' bookings

---

# 29. WhatsApp OTP Verification

No customer account is required.

Customer enters:

```text
Mobile Number
[____________]

[Send OTP]
```

The system sends an OTP to the mobile number through WhatsApp.

Customer enters:

```text
OTP
[______]

[Verify]
```

After successful verification:

```text
✓ Mobile number verified
```

## OTP Requirements

The system should support:

- OTP expiry
- Resend OTP
- Resend cooldown
- Maximum verification attempts
- Rate limiting
- Invalid OTP handling
- Verification status linked to the enquiry

The exact WhatsApp provider/API can be selected during implementation.

---

# 30. Customer Details

Recommended fields:

```text
Full Name
Mobile Number
WhatsApp Number
Email (optional)
Address (optional/configurable)
City
State
Purpose of Booking
Number of Guests
Number of Adults
Number of Children
Special Requirements
Additional Message
```

Admin should be able to configure required/optional fields where practical.

---

# 31. Enquiry Summary

Before submission, show:

```text
Booking Dates
Accommodation
Amenities
Customer Information
Purpose
Estimated Amount
```

Example:

```text
20 Dec 2026 → 22 Dec 2026

2 × AC Room
1 × AC Dormitory

50 Chairs
2 Coolers

Estimated Amount:
₹12,500
```

The customer must be clearly informed that this is an enquiry and not an automatically confirmed booking.

---

# 32. Terms & Conditions

Terms & Conditions are a mandatory part of the enquiry flow.

The booking page should contain a link:

> **View Terms & Conditions ↗**

The link should open the Terms & Conditions in a new page/tab.

Customer must accept the Terms & Conditions before submitting an enquiry.

Example:

```text
☐ I have read and agree to the Terms & Conditions.
```

The checkbox must be mandatory.

---

# 33. Admin-Editable Terms & Conditions

The Terms & Conditions must NOT be hard-coded permanently into the frontend.

Admin should have:

```text
Admin
  ↓
Settings
  ↓
Terms & Conditions
```

Admin can:

- View current Terms & Conditions
- Edit the content
- Preview it
- Publish changes
- Maintain versions
- View previous versions

Example:

```text
Terms & Conditions
Current Version: v2.1

[Edit]
[Preview]
[Publish]
[View History]
```

---

# 34. Terms Version Snapshot

When an enquiry is submitted, store:

- Terms version
- Terms content/version identifier
- Acceptance timestamp
- Customer's acceptance
- Enquiry ID

Example:

```text
Enquiry:
BV-2027-00125

Terms Version:
v2.1

Accepted:
Yes

Accepted At:
2027-01-05 14:32
```

If admin changes the Terms later, existing enquiries still retain the version accepted at the time of submission.

---

# 35. Enquiry Status

Recommended statuses:

```text
PENDING
UNDER REVIEW
APPROVED
REJECTED
CANCELLED
COMPLETED
EXPIRED
```

The initial submission status should be:

```text
PENDING
```

Approval does not need to trigger payment because there is no payment gateway in the initial system.

---

# 36. Admin Enquiry Management

Admin can:

- View enquiries
- Search enquiries
- Filter by date
- Filter by status
- View customer details
- View accommodation
- View amenities
- View calculated amount
- Add internal notes
- Approve
- Reject
- Modify
- Cancel
- Create manual enquiry
- Contact customer

---

# 37. Manual Enquiries

Admin must be able to create enquiries/bookings manually.

Reason:

Some customers may contact the Bhavan by:

- Phone
- Walk-in
- Direct office contact

Admin should be able to create:

```text
Source:
ONLINE
PHONE
WALK-IN
ADMIN
```

Manual entries must affect availability so that online customers do not see already committed inventory as freely available.

---

# 38. Availability Calendar

Admin should have a calendar showing effective availability.

Example:

```text
Date       Effective Rule      Status

10 Dec     Wedding             Restricted
11 Dec     Wedding             Restricted
12 Dec     Wedding             Restricted
13 Dec     Wedding             Restricted
14 Dec     Wedding             Restricted
15 Dec     Maintenance         CLOSED
16 Dec     Wedding             Restricted
```

The calendar should show the **effective current state**, not merely a list of every historical rule.

---

# 39. Rule Conflict Example

Suppose:

```text
Rule A:
Wedding
10–20 Dec
```

Then:

```text
Rule B:
Maintenance
15 Dec
```

Then:

```text
Rule C:
Social Event
18 Dec
```

Effective calendar:

```text
10–14 Dec → Wedding
15 Dec    → Maintenance
16–17 Dec → Wedding
18 Dec    → Social Event
19–20 Dec → Wedding
```

This is the expected override behaviour.

---

# 40. Booking Calculation

The system should calculate:

```text
Accommodation charges
+
Amenity charges
-
Applicable discounts
+
Applicable surcharges
=
Estimated Booking Amount
```

The calculation must use the rules effective for the selected dates.

---

# 41. Price Snapshot

When an enquiry is submitted, store the calculated values at that moment.

Example:

```text
AC Room:
2 units × 2 nights × ₹2,500
= ₹10,000

Chairs:
50 × ₹10
= ₹500

Discount:
-₹1,000

Estimated Total:
₹9,500
```

If the admin later changes the rates, the old enquiry should retain its original calculation.

This is necessary for auditability.

---

# 42. Admin Audit Log

The system should record important changes.

Examples:

```text
11 Aug 2026 10:00
Admin created Wedding Rule.

11 Aug 2026 10:05
Admin created Maintenance Rule for 15 Dec.

11 Aug 2026 10:10
Admin changed Social Event discount from 10% to 15%.

11 Aug 2026 10:15
Admin published Terms & Conditions v2.1.
```

Audit entries should include:

- User
- Action
- Date/time
- Object affected
- Old value where relevant
- New value where relevant

---

# 43. Admin Dashboard

The dashboard should show:

```text
Pending Enquiries
Today's Enquiries
Upcoming Enquiries
Approved Enquiries
Available Accommodation
Blocked Dates
Active Rules
```

Optional:

- Estimated booking value
- Occupancy summary
- Upcoming wedding dates
- Upcoming special events

---

# 44. Rule Management Screen

Recommended structure:

```text
Bhavan Rules

[+ Create Rule]

Rule Name       Type             Status

Wedding         Event/Pricing    Active
Social Event    Discount         Active
Anniversary     Discount         Active
Camp            Event            Active
Maintenance     Closure          Active
Festival        Event/Pricing    Active
```

Each rule can be:

- Active
- Inactive
- Archived

---

# 45. Rule Creation Screen

Example:

```text
Create Bhavan Rule

Rule Name:
[ Wedding ]

Rule Category:
[ Event / Pricing ]

Dates:
[ Select from Calendar ]

Availability:
AC Room          [Allowed/Blocked]
Non-AC Room      [Allowed/Blocked]
AC Dormitory     [Allowed/Blocked]
Non-AC Dormitory [Allowed/Blocked]

Minimum Stay:
[ 2 ]

Minimum Units:
[ 2 ]

Pricing:
[ Increase % ]

Value:
[ 50 ]

Allowed Purposes:
[ Wedding ]

Blocked Purposes:
[ Social Event ]
[ Anniversary ]
[ Camp ]

Rule Behaviour:
[ Override older conflicting rules ]

[ Save ]
```

The actual fields shown can change depending on the selected rule type.

---

# 46. Rule Templates

To make administration easier, the system should support templates.

Admin can create:

```text
Wedding
Social Event
Anniversary
Camp
Maintenance
```

Then later create:

```text
Custom Rule
```

by copying an existing template.

Example:

```text
[Create Custom Rule]

Start from:
○ Blank Rule
○ Wedding
○ Social Event
○ Maintenance
```

This reduces repetitive setup.

---

# 47. Normal / Default Behaviour

The system should have a default state when no special rule applies.

Example:

```text
Normal Day

AC Room:
₹1,500

Non-AC Room:
₹1,000

AC Dormitory:
₹3,000

Non-AC Dormitory:
₹2,000

Minimum Stay:
1 night
```

These values are editable by admin.

If a special rule applies, the special rule modifies or replaces the normal behaviour according to its configuration.

---

# 48. Customer-Facing Error/Restriction Messages

The system should translate internal rules into simple messages.

Examples:

Internal:

```text
Rule:
Wedding
Minimum stay = 2
```

Customer:

> A minimum stay of 2 nights is required for the selected dates.

Internal:

```text
Maintenance
All inventory blocked
```

Customer:

> The Bhavan is unavailable for the selected dates.

Internal:

```text
Wedding
Social purpose blocked
```

Customer:

> This type of event is not available for the selected dates.

Do not expose internal configuration or rule priority.

---

# 49. No Payment in Initial Version

The system will not integrate an online payment gateway.

The customer only submits an enquiry.

If the admin later wants to collect:

- Advance
- Security deposit
- Full payment

this can be added as a future module.

---

# 50. Future Extensibility

The architecture should leave room for:

- Payment gateway
- SMS notifications
- WhatsApp booking notifications
- Email notifications
- PDF confirmation
- Customer booking tracking through reference number
- Membership pricing
- Coupons
- Deposits
- Cancellation/refund policies
- Bed-level dormitory booking
- Multiple Bhavan locations
- Hall/ground booking
- Resource inventory
- Reports and analytics

These should not be required for V1.

---

# 51. Recommended Public Pages

Since the Bhavan system is a sub-section of an existing website, it should integrate into the existing website rather than create a separate standalone website.

Recommended pages/routes:

```text
/bhavan
/bhavan/booking
/bhavan/terms-and-conditions
/bhavan/enquiry/success
```

The exact routes should follow the existing website's routing conventions.

---

# 52. Recommended Admin Pages

```text
/admin/bhavan
/admin/bhavan/enquiries
/admin/bhavan/calendar
/admin/bhavan/accommodation
/admin/bhavan/amenities
/admin/bhavan/rules
/admin/bhavan/rules/create
/admin/bhavan/pricing
/admin/bhavan/terms
/admin/bhavan/audit-log
```

These are conceptual routes and should be adapted to the existing application's architecture.

---

# 53. Example End-to-End Scenario

Admin starts the year by creating:

```text
Wedding Rule

Pricing:
Special Wedding Rate

Minimum Stay:
2 nights

Minimum Units:
2

Social Event:
Not allowed

Anniversary:
Not allowed

Camp:
Not allowed
```

Admin selects 30 wedding dates and applies the rule.

The system now knows those dates have Wedding behaviour.

Later, admin notices that 15 December is needed for maintenance.

Admin creates:

```text
Maintenance

15 Dec

Everything:
Blocked
```

The system automatically makes 15 December unavailable despite the Wedding rule.

Later, admin decides that 18 December will be a special social event.

Admin creates:

```text
Social Event

18 Dec

Discount:
15%
```

The system applies the newest applicable rule to 18 December according to the configured rule behaviour.

The customer only sees the resulting availability, price and allowed booking options.

---

# 54. Core Business Logic

The system should evaluate a booking approximately as follows:

```text
1. Receive selected dates.
2. Find all active rules matching those dates.
3. Sort applicable rules by creation/version priority.
4. Determine the effective availability/restrictions.
5. Determine the applicable booking-purpose restrictions.
6. Determine the effective accommodation rates.
7. Determine applicable discounts/surcharges.
8. Validate minimum/maximum stay and units.
9. Validate inventory and amenity availability.
10. Calculate estimated amount.
11. Show customer only the resulting public information.
12. Verify WhatsApp OTP.
13. Require Terms & Conditions acceptance.
14. Save enquiry with price/rule/terms snapshots.
15. Send enquiry to admin.
```

---

# 55. Important Data Integrity Rules

The implementation must ensure:

- No negative inventory.
- No invalid date ranges.
- Check-out must be after check-in.
- Inactive rules must not affect new enquiries.
- Old enquiry prices must not change when rates change.
- Old accepted Terms & Conditions must remain associated with the enquiry.
- Overridden rules must remain available in history.
- Admin changes must be auditable.
- OTPs must expire.
- OTP attempts must be rate-limited.
- Customer cannot submit without successful OTP verification.
- Customer cannot submit without accepting current Terms & Conditions.
- Internal admin rules must never be exposed through public API responses.

---

# 56. MVP Priority

## Must Have

- Public booking/enquiry form
- Date selection
- AC Room
- Non-AC Room
- AC Dormitory
- Non-AC Dormitory
- Amenities
- Dynamic pricing
- Multiple date selection for admin
- Reusable rule profiles
- Wedding rules
- Discount rules
- Maintenance/blocking rules
- Rule override behaviour
- Availability calculation
- WhatsApp OTP
- Customer details
- Enquiry submission
- Admin enquiry management
- Admin calendar
- Admin-editable Terms & Conditions
- Terms versioning
- Price snapshot
- Rule audit/history

## Should Have

- Manual enquiries
- Rule templates
- Bulk date import
- Advanced reporting
- Manager permissions
- PDF enquiry/confirmation
- Notifications

## Later

- Online payment
- Customer accounts
- Bed-level dormitory booking
- Membership pricing
- Coupons
- Multiple Bhavan locations
- Advanced analytics

---

# 57. Final Product Principle

The Bhavan Booking System should not be built around fixed assumptions such as:

```text
Wedding = 2 nights
Wedding = +50%
Maintenance = unavailable
Social = 15% discount
```

Those are only examples.

The actual system must be built so that:

> **Admin defines what Wedding means.**
>
> **Admin defines what Social Event means.**
>
> **Admin defines what Maintenance means.**
>
> **Admin defines the dates.**
>
> **Admin defines the price.**
>
> **Admin defines discounts.**
>
> **Admin defines restrictions.**
>
> **Admin defines the Terms & Conditions.**

The application then executes those rules automatically.

The customer only sees the final available options, effective price, necessary booking conditions, and Terms & Conditions.

This makes the system flexible enough to adapt to future Bhavan policies without requiring a developer to change the code every time a rule changes.
