# Web Push roadmap

- [x] Phase 0: read-only audit and user decisions.
- [x] Phase 1: subscription table, owner-only RLS and nullable notification metadata.
- [x] Phase 1: securely collect VAPID_PRIVATE_KEY and VAPID_SUBJECT.
- [ ] Phase 1: frontend public-key constant — awaiting user's VAPID public key in chat.
- [ ] Phase 2: push-only worker, production-only registration, subscription helper and enable/disable controls — awaiting go-ahead.
- [ ] Phase 3: secret-authenticated asynchronous sender; skip recipients without subscriptions and group-message rows — awaiting go-ahead.
- [ ] Phase 4: application link correction and group-message metadata marker only; keep existing producers and enum — awaiting go-ahead.
- [ ] Phase 5: existing direct-message producer suppression and sender tags — awaiting go-ahead.
- [ ] Phase 6: production and Android verification, inventory and rollback handover — awaiting go-ahead.