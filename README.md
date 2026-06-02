# Shalean Cleaning Services Booking System V1.0

Basic booking MVP built with Next.js 16 App Router, TypeScript, Tailwind CSS v4,
shadcn/ui, and Supabase.

## Features

- Customer booking flow at `/book`
- Success page at `/booking-success`
- Admin booking dashboard at `/admin/bookings`
- Supabase-backed `services` and `bookings` tables
- Admin status updates: Pending, Confirmed, Completed, Cancelled
- Base price estimates for V1.0 services

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment variables:

```bash
cp .env.example .env.local
```

Set:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Run the SQL migration in Supabase:

```text
supabase/migrations/20260601220000_create_booking_mvp.sql
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/` - Shalean MVP home screen
- `/book` - customer booking form
- `/booking-success` - friendly confirmation screen
- `/admin/bookings` - admin bookings table and status updates

## Verification

```bash
npm run lint
npm run build
```

