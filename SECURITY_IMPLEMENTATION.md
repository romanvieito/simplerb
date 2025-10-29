# Security Implementation for Ads Pilot

## Overview
This document outlines the security measures implemented for the Ads Pilot experience at `http://localhost:3000/ads`.

## Security Posture
The legacy `/ads-dashboard` UI has been retired in favour of the streamlined `/ads` surface. The page shell is visible to all visitors, but any action that touches Google Ads data requires:

- a signed-in Clerk session, and
- explicit admin approval via `validateAdPilotAccess`.

This ensures only authorised team members can read or manipulate campaign data while keeping the marketing page publicly accessible.

## Security Controls

### 1. Authentication & Authorisation
- **Clerk enforcement**: API routes require a valid Clerk session (via `x-user-email`).
- **Admin gating**: `validateAdPilotAccess` verifies admin status against the database (with environment fallbacks).
- **Frontend guardrails**: `ads.tsx` prevents non-admin users from triggering protected actions and communicates the limitation with clear UI messaging.

### 2. Protected API Routes
The following Ads endpoints enforce authentication and admin validation:
- `GET /api/google-ads/get-campaign-keywords`
- `POST /api/google-ads/find-similar-keywords`
- `GET /api/google-ads/metrics`
- `POST /api/google-ads/optimize-advanced`
- `POST /api/google-ads/create-campaign`
- `POST /api/google-ads/keyword-planning`
- `GET /api/google-ads/whoami`
- `POST /api/keyword-research`
- `POST /api/google-ads/maintenance`
- `POST /api/google-ads/optimize`

### 3. Admin Verification Flow
```typescript
// pages/api/google-ads/get-campaign-keywords.ts
const userEmail = req.headers['x-user-email'] as string;
if (!(await validateAdPilotAccess(userEmail))) {
  return res.status(403).json({ success: false, error: 'Access denied' });
}
```

The same pattern is used across the Ads Pilot API surface, ensuring no Google Ads call is executed without admin approval.

### 4. Middleware Configuration
```typescript
export default authMiddleware({
  publicRoutes: [
    '/', '/pricing', '/faq', '/domain', '/web', '/sites',
    '/email', '/ads', '/find-keywords', '/api/clerk-webhooks(.*)',
    // …other explicitly whitelisted utilities
  ],
});
```

Sensitive Ads APIs are intentionally omitted from `publicRoutes`, forcing Clerk authentication before they execute.

## Security Best Practices Implemented

1. **Principle of least privilege** — only approved admins can reach Ads data.
2. **Defense in depth** — middleware, frontend, and backend checks work together.
3. **Secure error handling** — descriptive but non-sensitive error messages.
4. **Session integrity** — Clerk handles token rotation and session validation.
5. **Database-backed authorisation** — admin status lives in the `users` table.

## Environment Variables Required

Ensure these environment variables are configured in production and local development:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ADPILOT_ADMIN_EMAILS` (fallback list when the database check fails)
- Google Ads credentials (`GADS_*`) required by downstream APIs

## Testing Security

1. **Signed-out visit** — open `/ads` without signing in; CTA buttons render but campaign actions stay disabled.
2. **Authenticated non-admin** — sign in with a non-admin user and attempt to fetch campaign keywords; you should receive a toast error and a `403` response.
3. **API probe** — call `/api/google-ads/get-campaign-keywords` without the `x-user-email` header or with a non-admin email; the API returns `401/403`.

## Future Security Considerations

1. Rate limiting on Ads APIs to mitigate brute-force attempts.
2. Security event logging for sensitive operations.
3. Granular role-based access beyond the admin flag.
4. Scheduled rotation of Google Ads OAuth credentials.
5. Additional input validation and sanitisation on user-provided data.
6. Hardened CORS policies for production deployments.

## Conclusion

Ads Pilot now ensures that only authorised administrators can access Google Ads resources while leaving the marketing shell publicly viewable. With Clerk authentication, database-backed admin checks, and consistent API enforcement, sensitive campaign data remains protected from unauthorised access.
