# Web Push roadmap

- [x] Phase 0: read-only audit and user decisions.
- [x] Phase 1: subscription table, owner-only RLS and nullable notification metadata.
- [x] Phase 1: securely collect VAPID_PRIVATE_KEY and VAPID_SUBJECT.
- [x] Phase 1: frontend public-key constant supplied by user.
- [x] Phase 2: public key, messaging-only worker, production-only helper, shared controls, bounded logout cleanup and onboarding timer pause; 32 automated checks and desktop/mobile preview-safety checks passed.
- [ ] Phase 2 real-device subscription/controls verification — requires publication and a signed-in Student/Employer session; own-account session minting unavailable, published worker currently 404.
- [ ] Phase 3: secret-authenticated asynchronous sender; skip recipients without subscriptions and group-message rows — awaiting go-ahead.
- [ ] Phase 4: application link correction and group-message metadata marker only; keep existing producers and enum — awaiting go-ahead.
- [ ] Phase 5: existing direct-message producer suppression and sender tags — awaiting go-ahead.
- [ ] Phase 6: production and Android verification, inventory and rollback handover — awaiting go-ahead.