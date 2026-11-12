# Security Specification: SoulSync Couple Chamber

## 1. Data Invariants
- A couple's chamber contains active pairing link state. Only the active assigned `userA` or `userB` can read or write to their specific room document `couples/{coupleId}`.
- Untrusted users cannot inspect, alter, or hijack an existing chamber.
- System generated values (e.g. initial setup) are verified.
- Timestamps must correspond to the transaction time or valid ISO strings.

## 2. Dirty Dozen payloads (Mitigated by Rules)
1. Attempt to read other couples' rooms without being userA or userB.
2. Direct delete of chamber document by either user (Chambers are permanent or archive-only).
3. Spoofing userA or userB matching IDs during create.
4. Setting room isPaired status to true before a second user has joined.
5. Hijacking an existing active chamber code.
6. Writing huge string lengths to messages (denial of wallet).
7. Injecting fake fields like `isAdmin` into profiles.
8. Bypassing state locks on games.
9. Impersonating partner messages in the chat section.
10. Spoofing timestamps from the client.
11. Reading PII details without matching authorization credentials.
12. Creating empty collections under sub-paths.

## 3. Rules Implementation Strategy
We will implement safe Firestore Rules restricting `/couples/{coupleId}` to matched room users.
