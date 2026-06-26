# Implementation Plan - Fix OTP Sending and Registration Bugs

This plan outlines the steps to resolve the database migration failures preventing the backend from starting correctly, as well as fixing a critical API crash in the registration flow.

## User Review Required

> [!IMPORTANT]
> The database migration fails because tables `email_otp_requests` and `phone_otp_requests` were referenced for index creation and column alteration in a later migration, but were never created in the initial migrations. We will resolve this by adding their table definitions to the initial schema migration so that database creation is successful.
>
> We also found a critical bug in the `/register` backend endpoint where `otp_log` is modified outside the conditional block, causing email registrations to crash with `NameError`. We will remove this redundant line since OTP invalidation is already handled within the mobile registration block.

## Proposed Changes

### Database Migration

#### [MODIFY] [96a2643ebe35_initial_schema.py](file:///C:/Users/Dell/Desktop/agrawalsamaj/backend/alembic/versions/96a2643ebe35_initial_schema.py)
- Add tables `email_otp_requests` and `phone_otp_requests` to the `upgrade` method.
- Add drop statements for these tables in the `downgrade` method.

### Backend Routing

#### [MODIFY] [auth.py](file:///C:/Users/Dell/Desktop/agrawalsamaj/backend/app/routers/auth.py)
- Remove the redundant/buggy `otp_log.is_used = True` statement at line 473 which causes a `NameError` during email registration.

## Verification Plan

### Automated Tests / Commands
1. Delete the existing partial SQLite `test.db` database.
2. Run Alembic migrations:
   ```bash
   venv\Scripts\alembic upgrade head
   ```
3. Run the database test script to verify all tables are successfully queried:
   ```bash
   venv\Scripts\python scripts/test_db_connection.py
   ```
4. Run the user seeding script to populate default users:
   ```bash
   venv\Scripts\python scripts/seed_users.py
   ```

### Manual Verification
1. Start the FastAPI backend server:
   ```bash
   venv\Scripts\python run.py
   ```
2. Start the Next.js frontend application:
   ```bash
   npm run dev
   ```
3. Use a browser or automated agent to visit the registration page at `http://localhost:3000/register`.
4. Test the registration flow for both email and phone to ensure OTP is successfully generated, retrieved (via console log for developer mode), verified, and that registration succeeds.
