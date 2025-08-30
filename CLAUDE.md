# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Architecture Overview

This is a Next.js 15 application for managing guest passes in a residential building (Frontier Tower). The system uses a hybrid architecture with both Supabase and an external Frontier API.

**Key Components:**
- **Next.js App Router** - Modern file-based routing in `/app` directory
- **Supabase Database** - Primary data storage with migrations in `/supabase/migrations/`
- **Frontier API Integration** - External service for authentication and profiles
- **QR Code System** - Guest pass verification using QR codes

**Data Flow:**
1. Authentication happens through Frontier API (`utils/frontierClient.js`)
2. Guest pass data is stored in Supabase (`utils/supabaseAdmin.js`, `utils/supabaseBrowser.js`)
3. QR codes are generated for passes and stored with encrypted keys (`lib/qrKeys.js`)

### Key Directories

- `/app/` - Next.js 15 App Router pages and API routes
  - `/api/` - Server-side API endpoints for admin, auth, and guest operations
  - Three main portals: `/admin/`, `/guest/`, `/resident/`
- `/components/` - React components including portal components and UI elements
- `/utils/` - Utility functions for authentication, database operations, QR handling
- `/supabase/` - Database migrations and edge functions
- `/lib/` - Shared libraries (QR key management, utilities)

### Database Architecture

Uses Supabase with these main tables (see migrations):
- `residents` - Building residents with unit info
- `guest_passes` - Guest passes with status tracking  
- `qr_codes` - QR code data with encrypted keys
- Reset periods tracking for monthly pass limits (3 passes per resident per month)

### Authentication & Security

- **Dual Auth System**: Frontier API for user auth + Supabase for data
- **CSRF Protection**: Implemented in `utils/csrf.js`
- **Rate Limiting**: Using Upstash Redis in `utils/ratelimit.js`
- **Security Headers**: Configured in `next.config.js` and `vercel.json`
- **Middleware**: Currently disabled for testing (`middleware.js`)

### QR Code System

QR codes use encrypted keys managed by `/lib/qrKeys.js`. The system:
1. Generates unique QR codes for each guest pass
2. Stores encrypted QR data in database
3. Provides verification endpoints for scanning

### Environment & Deployment

- **Vercel Deployment**: Configured via `vercel.json`
- **Netlify Support**: Alternative deployment via `netlify.toml`
- **Environment Variables**: Requires Supabase credentials and Frontier API key
- **Supabase Functions**: Edge functions in `/supabase/functions/`

### Development Patterns

- Use `"use client"` directive for client components requiring browser APIs
- Server components by default for better performance
- Supabase Admin client for server-side operations
- Browser client for client-side operations
- Mock data available in `utils/mockData.js` for development

### Testing Credentials (Development)

From README.md:
- Admin: admin@frontiertower.com / admin123  
- Resident: john.smith@example.com / 101