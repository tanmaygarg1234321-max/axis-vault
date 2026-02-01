
# VPS/Pterodactyl Deployment Plan: Express.js Backend

## Overview

This plan creates a complete Express.js backend server that replaces all Supabase Edge Functions, allowing the application to run fully on a VPS or Pterodactyl panel without any Supabase backend dependencies.

## Current Architecture Analysis

### Edge Functions to Replace
The frontend currently calls 7 Edge Functions:

| Edge Function | Purpose | Called By |
|--------------|---------|-----------|
| `admin-login` | Admin authentication (login + password change) | `Admin.tsx` via `invokeEdgeFunction` |
| `admin-data` | Fetch all admin data (orders, logs, coupons, settings) | `Admin.tsx` via `invokeEdgeFunction` |
| `admin-action` | Admin operations (maintenance, coupons, retry delivery, bulk email) | `Admin.tsx` via `invokeEdgeFunction` |
| `create-order` | Create Razorpay payment order | `Checkout.tsx` via `supabase.functions.invoke` |
| `verify-payment` | Verify Razorpay payment + RCON delivery | `Checkout.tsx` via `supabase.functions.invoke` |
| `send-email` | Send emails via Google Apps Script | Called internally by other functions |
| `check-rank-expiry` | CRON job for rank expiry & reminders | External trigger (cron) |

### Frontend API Calling Patterns
Two different invocation methods are used:
1. **`invokeEdgeFunction`** (in `src/lib/edge-functions.ts`) - Calls `${VITE_SUPABASE_URL}/functions/v1/{functionName}`
2. **`supabase.functions.invoke`** - Supabase SDK method calling same endpoint

---

## Implementation Plan

### Phase 1: Create Express.js Server

**File: `server/index.js`** (CommonJS for compatibility)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                         │
├─────────────────────────────────────────────────────────────┤
│  Static Files: Serve /dist folder                           │
│                                                              │
│  API Routes:                                                 │
│  ├── POST /functions/v1/admin-login                         │
│  ├── POST /functions/v1/admin-data                          │
│  ├── POST /functions/v1/admin-action                        │
│  ├── POST /functions/v1/create-order                        │
│  ├── POST /functions/v1/verify-payment                      │
│  ├── POST /functions/v1/send-email                          │
│  └── POST /functions/v1/check-rank-expiry                   │
│                                                              │
│  Port: process.env.PORT || 24611                            │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Port Each Edge Function to Express Route

Each Deno edge function will be converted to a Node.js compatible Express route handler:

#### 1. Admin Login (`/functions/v1/admin-login`)
- PBKDF2 password hashing (using Node.js `crypto` instead of Web Crypto API)
- JWT token creation using `jsonwebtoken` package
- Rate limiting via database queries
- Password change flow

#### 2. Admin Data (`/functions/v1/admin-data`)
- JWT token verification
- Fetch orders, logs, coupons, settings from database
- Return aggregated data

#### 3. Admin Action (`/functions/v1/admin-action`)
- JWT token verification
- Handle 10+ action types: `toggle_maintenance`, `retry_delivery`, `create_coupon`, `delete_coupon`, `update_coupon`, `toggle_coupon_status`, `clear_data`, `send_bulk_email`
- RCON client implementation for Node.js (TCP socket)

#### 4. Create Order (`/functions/v1/create-order`)
- Input validation for Minecraft/Discord usernames
- Razorpay order creation via API
- Database order insertion

#### 5. Verify Payment (`/functions/v1/verify-payment`)
- Razorpay signature verification (HMAC SHA256)
- RCON command execution for delivery
- Order status update
- Email sending

#### 6. Send Email (`/functions/v1/send-email`)
- Google Apps Script integration (HTTP POST)
- Email templates for: receipt, failed, expiry_reminder, bulk

#### 7. Check Rank Expiry (`/functions/v1/check-rank-expiry`)
- Query active ranks
- RCON commands for expired rank removal
- Email reminders for expiring ranks

### Phase 3: Database Connection

Since Supabase is still the database, we'll use the **Supabase REST API** with the service role key (same as edge functions do):

```text
Environment Variables Required:
├── SUPABASE_URL
├── SUPABASE_SERVICE_ROLE_KEY
├── RAZORPAY_KEY_ID
├── RAZORPAY_KEY_SECRET
├── RCON_HOST
├── RCON_PORT
├── RCON_PASSWORD
├── ADMIN_JWT_SECRET
└── PORT (optional, default: 24611)
```

### Phase 4: Update Frontend Configuration

Modify `src/lib/edge-functions.ts` to support configurable API base URL:

```typescript
// Check for custom API URL (for VPS deployment)
const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SUPABASE_URL;
```

This allows:
- **Lovable/Supabase mode**: Uses existing `VITE_SUPABASE_URL`  
- **VPS mode**: Set `VITE_API_URL` to point to Express server (e.g., `http://localhost:24611`)

---

## Files to Create

| File | Purpose |
|------|---------|
| `server/index.js` | Main Express server entry point |
| `server/routes/admin-login.js` | Admin login route handler |
| `server/routes/admin-data.js` | Admin data fetching route |
| `server/routes/admin-action.js` | Admin actions route |
| `server/routes/create-order.js` | Order creation route |
| `server/routes/verify-payment.js` | Payment verification route |
| `server/routes/send-email.js` | Email sending route |
| `server/routes/check-rank-expiry.js` | Rank expiry check route |
| `server/lib/rcon.js` | RCON client for Node.js |
| `server/lib/jwt.js` | JWT utilities (sign/verify) |
| `server/lib/crypto.js` | PBKDF2 password hashing |
| `server/lib/supabase.js` | Supabase REST API helper |
| `server/lib/email.js` | Email template & sending |
| `server/.env.example` | Environment variables template |
| `start.sh` | Pterodactyl startup script |

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add Express dependencies, `start` script |
| `src/lib/edge-functions.ts` | Support `VITE_API_URL` environment variable |

---

## Technical Specifications

### Dependencies to Add
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "jsonwebtoken": "^9.0.2",
  "dotenv": "^16.3.1"
}
```

### Startup Script (`start.sh`)
```bash
#!/bin/bash
# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  npm install
fi

# Build frontend if dist doesn't exist
if [ ! -d "dist" ]; then
  npm run build
fi

# Start the server
node server/index.js
```

### Server Structure
```text
server/
├── index.js              # Express app setup, static file serving
├── routes/
│   ├── admin-login.js
│   ├── admin-data.js
│   ├── admin-action.js
│   ├── create-order.js
│   ├── verify-payment.js
│   ├── send-email.js
│   └── check-rank-expiry.js
└── lib/
    ├── rcon.js           # TCP-based RCON client
    ├── jwt.js            # HS256 JWT sign/verify
    ├── crypto.js         # PBKDF2 password hashing
    ├── supabase.js       # REST API wrapper
    └── email.js          # Apps Script email sender
```

---

## Pterodactyl Configuration

### Egg Settings
- **Startup Command**: `bash start.sh` or `node server/index.js`
- **Main File**: `server/index.js`
- **Port Variable**: `PORT` (auto-assigned by panel)

### Environment Variables
All secrets should be configured in Pterodactyl's "Startup" → "Variables" section.

---

## Security Considerations

1. **JWT Secret**: Must match the one used in Supabase edge functions to allow existing admin tokens to work
2. **Service Role Key**: Provides full database access - keep secure
3. **CORS**: Configured to allow requests from the same origin (served from Express)
4. **Rate Limiting**: Preserved from original edge functions via database-based tracking

---

## Migration Path

1. Deploy Express server with all routes
2. Set `VITE_API_URL` in `.env` to point to Express server
3. Rebuild frontend (`npm run build`)
4. Test all functionality:
   - Admin login/logout
   - Order creation
   - Payment verification
   - Email sending
   - RCON delivery
5. Switch Pterodactyl to use `server/index.js` as main file

---

## Estimated Implementation Size

- **~2000 lines** of JavaScript (server-side)
- **~20 lines** modified in frontend
- **13 new files** + **2 modified files**
