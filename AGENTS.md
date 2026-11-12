## Web Push
- Store device subscriptions against the unique `public.profiles.user_id` with cascade deletion and owner-only RLS; reuse the existing auth-to-profile cascade without adding deletion hooks.
- Keep optional notification classification, sender identity and device replacement tags nullable; existing producers and clients must remain compatible until their approved phases.
- Keep the VAPID public key in a dedicated frontend constant; private key and subject belong only in server secrets.
- Keep the messaging worker free of cache/fetch handlers; centralize production-only registration and device ownership/cleanup in the push helper to isolate push failures from auth and application actions.
- Reuse shared device controls and a remaining-time onboarding timer so only active enablement pauses redirection.