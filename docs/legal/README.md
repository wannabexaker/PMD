# Legal documents — drafts

This folder holds **draft** legal documents for the hosted PMD service at
<https://pmd.olamov.com>.

| File | What it is | Status |
| --- | --- | --- |
| [`privacy-policy.md`](./privacy-policy.md) | GDPR Article 13 privacy notice | Draft — not published |
| [`terms-of-use.md`](./terms-of-use.md) | Terms of use for the hosted service | Draft — not published |

**Neither has been reviewed by a lawyer. Neither is in force.**

They were written by the developer, by reading the source code, and describe what PMD
actually does rather than what a template says it might do. The factual claims (retention
periods, cookie names, what is stored, what is anonymised, what deletion removes) were
verified against the code and the running site.

The `LICENSE` at the repository root covers the **source code**. These documents cover the
**hosted service**. Different things.

**Last reviewed against the code:** 15 July 2026.

---

## Blockers — fix before publishing

These are not lawyer questions. They are things that would make the published documents
**false on day one**, or that the documents currently have to disclose as a weakness.

### 1. Avatar image files are never deleted, and they are publicly reachable

**This is the big one, and it is new.** There is **no file-deletion call anywhere in the
backend** — verified by grepping the whole source tree for `Files.delete`,
`deleteIfExists` and `.toFile().delete()`. Zero hits.

Consequences:

- `AccountPrivacyService.deleteAccount()` deletes the user document, but **not** the avatar
  image on disk. Because `SecurityConfig` serves `/uploads/**` with `permitAll()`, a
  deleted user's photo stays reachable at its UUID URL **forever**, with no account behind
  it.
- Changing your avatar orphans the old file the same way. It is never cleaned up. This is
  also an unbounded disk-growth problem on a Pi.

This is an Article 17 erasure gap, and it is the worst possible place to have one: it is
exactly the data (a photo of a person's face) and exactly the mechanism (an unauthenticated
public URL) that the privacy policy has to flag as its most sensitive disclosure.

The drafts currently tell the truth about this — privacy policy §8, §13, §14.2 and terms
§8.1, §11.2 all state plainly that the image file is not deleted, and point users at the
email address for manual removal. **That wording is deliberate and it is accurate today.**

**Fix:** delete the avatar file in `deleteAccount()`, and delete the superseded file when
an avatar is replaced. Then update these five places to say the avatar is deleted with the
account. Consider also whether `/uploads/**` should stay `permitAll()` at all.

Relevant files:
- `backend/pmd-backend/src/main/java/com/pmd/privacy/service/AccountPrivacyService.java`
- `backend/pmd-backend/src/main/java/com/pmd/upload/service/UploadService.java`
- `backend/pmd-backend/src/main/java/com/pmd/auth/security/SecurityConfig.java` (line ~78)

### 2. Processor terms are not accepted

The privacy policy states that transfers to Vercel, Cloudflare and Google rely on SCCs
and/or the EU–US Data Privacy Framework "as applicable". **No DPA has actually been
accepted with any of them.** This must be done, and privacy policy §11 updated to state the
real mechanism per provider rather than a hedge. See lawyer question 4.

### 3. The registration checkbox must actually exist

Both documents now describe a mandatory checkbox at registration (terms §1, privacy policy
§4.9). **Confirm it is shipped and mandatory before publishing**, or the terms describe an
acceptance flow that does not exist — which would undermine whether the terms were
incorporated into the contract at all. See lawyer questions 21 and 22.

---

## Resolved since the first draft

- ~~Export and account deletion do not exist~~ — **done.** `GET /api/auth/me/export` and
  `DELETE /api/auth/me` are implemented in `AuthController`, backed by
  `AccountPrivacyService`, and surfaced under "Your data" on the profile page. Verified in
  the code. The drafts describe them as available. The implementation is careful: the
  export deliberately omits `passwordHash` and `googleId`, and deletion refuses to strand a
  workspace whose only manager is leaving.
- ~~The IP fingerprint salt is empty in production~~ — **fixed.**
  `PMD_SECURITY_CLIENT_METADATA_HASH_SALT` is now in `.env.pi.example` and required in
  `docker-compose.pi.yml` with `:?` fail-fast. Privacy policy §5 now describes the hash as
  salted, while still being explicit that the result is pseudonymous, not anonymous.
- ~~A postal address must be published~~ — **withdrawn; the original claim was wrong.** See
  open question A below for the corrected framing.

---

## What to ask the lawyer to check

Ordered roughly by how much it matters.

### Privacy policy

1. **Is the legitimate interests balancing adequate?** Four processing activities rely on
   Article 6(1)(f): the workspace people directory (§4.4), session/sign-in security logging
   (§4.5), the workspace audit log (§4.6), and Turnstile (§4.7). Each states its balancing
   inline. Is that reasoning sufficient, and does a documented LIA need to exist separately
   from the notice?
2. **The `people` collection and Article 14.** A workspace can hold directory entries
   (display name + email, per workspace) describing people who are **not PMD users** and who
   were never told. Most are fictional demo seed data, but an administrator can create real
   ones. Article 14 obliges a controller to inform a data subject whose data was obtained
   from someone else. Does that bite here, does the "disproportionate effort" exemption in
   Art. 14(5)(b) apply at this scale, and should the feature be restricted instead? This was
   missing from the original data inventory and was found by reading
   `AccountPrivacyService.deleteAccount()`.
3. **Is "pseudonymous, not anonymous" the right characterisation?** §5 deliberately does
   *not* claim the /24-masked IP plus salted hash falls outside the GDPR, because it is
   stored next to a user id (Art. 4(5), Recital 26). Confirm this is right, and that
   describing it as "anonymized" in the repo-root `README.md` is an overstatement that
   should be corrected for consistency.
4. **The three providers' roles and the transfer mechanism.** Vercel and Cloudflare are
   described as processors; Google as an independent controller for the sign-in. Correct —
   particularly for Cloudflare (CDN + Turnstile might split)? Which mechanism applies to
   each: SCCs, the EU–US DPF, or both? Is a transfer impact assessment needed at this scale?
   See blocker 2.
5. **Is an Article 30 record of processing activities required?** The Art. 30(5) exemption
   for organisations under 250 people does not apply where processing is not occasional —
   and running a live service is not occasional. So it probably *is* required despite being
   a one-person operation. Confirm, and confirm what a proportionate record looks like here.
6. **Is a cookie banner needed?** The position taken is no: only `PMD_RT` and `PMD_CSRF` are
   set, both strictly necessary for authentication, no analytics, no advertising. Turnstile
   and Google may set cookies in their own contexts when used. Confirm this holds under the
   Greek implementation of the ePrivacy Directive and current Hellenic DPA guidance —
   particularly whether the Turnstile cookie counts as strictly necessary.
7. **The avatar disclosure** (§8). Given blocker 1, is disclosing this plainly enough in the
   interim, or must publication wait for the fix? Once fixed, is serving avatars from an
   unauthenticated UUID URL at all defensible, or does it need a permission check?
8. **The platform administrator disclosure** (§9). The operator can enter any workspace with
   owner-level permissions (`WorkspaceService.requireActiveMembership` grants a synthetic
   "Platform Admin" membership when `user.isAdmin()`). §9 discloses this openly. Is that
   sufficient, or does operator access need a stated policy, logging, or a stricter
   justification?
9. **The deletion carve-out** (§14.2). Content authored in other people's workspaces survives
   account deletion and stops resolving to a name. Is that defensible under Article 17, and
   is the stated justification (other members' legitimate interests in their own workspace
   records) the right one? Is the case-by-case email fallback sufficient?
10. **Retention periods.** 365 days for audit events, 180 days for sign-in security events,
    30 days for revoked sessions. Justifiable, or does any need shortening? The 180-day
    figure is hardcoded in `AuthSessionRetentionService`, not configurable.
11. **The failed-login email record.** `auth_security_events` stores the email address
    entered in a failed sign-in attempt, including for addresses with no account — i.e.
    personal data about people who are not users. Any Article 14 obligation? Is the
    retention appropriate?
12. **Breach notification.** §18 commits to the Article 33 72-hour notification. Can a
    one-person operation realistically meet this, and should the policy describe a process
    rather than just a promise?

### Terms of use

13. **The liability cap** (§12.2). Greater of amounts paid (currently zero) or EUR 100. Is a
    cap of this shape enforceable against a Greek/EU consumer? Is a monetary cap appropriate
    at all for a free service, or does it risk being struck as an unfair term — taking the
    rest of the clause with it?
14. **Are the §12.1 carve-outs complete and correctly worded?** Death/personal injury, fraud,
    gross negligence (βαριά αμέλεια), wilful misconduct (δόλος), mandatory consumer rights.
    Anything missing under Greek law? Are the Greek terms used correctly?
15. **The data-loss limitation** (§12.2). It excludes liability for data loss except where
    caused by gross negligence or wilful misconduct, backed by the honest warning in §4. Is
    that enforceable given that the operator *knows* the hosting is unreliable and has said
    so? Does saying so plainly help or hurt?
16. **Governing law and jurisdiction** (§15). Greek law, Greek courts, with the consumer
    carve-out for mandatory home-country rules (Rome I Art. 6). Correct? **Which specific
    court should be named?** — still a placeholder.
17. **The ODR platform.** The EU ODR platform shut down in July 2025. The draft flags this
    rather than linking a dead platform. What, if anything, is now required in its place?
18. **The content licence** (§8). Drawn narrowly enough to be fair while still covering what
    a server actually has to do (host, copy, transmit, display, back up)?
19. **The indemnity** (§13). Business users only, consumers excluded. Enforceable and
    appropriately scoped?
20. **Age 16** (terms §5, privacy policy §17). Chosen as a conservative default; the
    developer has not decided. Greece has set its own digital-consent age under Art. 8(1)
    GDPR and it is understood to be lower than 16 — confirm rather than assume. Note that
    Art. 8 only bites where consent is the basis, and here the basis is contract, so the
    real question may be capacity to contract rather than Art. 8 at all. What should the
    number be, and on what reasoning?

### Both

21. **Is the registration checkbox the right acceptance mechanism?** Mandatory tick at
    registration accepting the Terms and confirming the Privacy Policy has been read. Is
    that sufficient to incorporate the terms? Should the two be split into separate ticks?
    Should the Privacy Policy be acknowledged at all, given it is a notice rather than
    something to agree to? See blocker 3.
22. **Versioning and proof of acceptance.** Should PMD record which version of the terms each
    user accepted, and when? Nothing records this today, and the checkbox alone does not
    prove *what* was accepted.
23. **Language.** Both documents are in English. The service is operated from Greece and may
    have Greek users. Is a Greek translation required, or advisable? If both exist, which
    governs?
24. **The changes clauses** (privacy policy §19, terms §14). Both promise advance notice of
    material changes and commit to purposes staying limited to operating PMD. Is the wording
    strong enough to avoid the unfair-terms problem under Directive 93/13 Annex 1(j) with a
    unilateral variation right?
25. **Anything material that is simply missing.** These were written by a developer working
    from the code, not by a lawyer working from a checklist. The most useful thing a lawyer
    can say may be about something not on this list.

---

## Open questions for the developer

### A. Does PMD need to publish a geographic address?

**Decision taken: publish name and email only, for now.**

Both documents identify the controller as **Ioannis Dimos (Ιωάννης Δήμος)**, a natural
person in Greece, contactable at **dimos.is.dev@gmail.com**. No postal address is published.

The reasoning: GDPR Art. 13(1)(a) requires "the identity and the contact details of the
controller". It does **not** itself mandate a geographic address — an email address is
contact details. The obligation to publish a physical address comes from e-commerce /
information society service law (Directive 2000/31/EC Art. 5 and its Greek implementation),
whose application to a free, non-commercial personal project is arguable.

**The question for the lawyer:** does PMD qualify as an information society service such
that a geographic address must be published under e-commerce law? Relevant considerations:
it is free, there is no advertising and no revenue, but it is publicly available at a
domain and offered to the world at large. If the answer is yes, the developer needs to
decide between publishing a home address, using a service address, or forming a company —
so please flag this early rather than at the end of the review.

Until advised otherwise, name + email stands.

### B. Still undecided

- **The age threshold** — 16 is a placeholder pending question 20.
- **The competent court** — placeholder in terms §15, pending question 16.

### C. Operational

- **Email provider** — no SMTP is configured (`.env.pi.example` points at `localhost:1025`,
  and `MANAGEMENT_HEALTH_MAIL_ENABLED` is false). Both documents say emails are not
  currently sent, and both promise notification of material changes "by email if a mail
  server is configured by then". When SMTP is configured, the mail provider becomes a new
  recipient and must be added to privacy policy §11, and the change-notification wording in
  both documents should be tightened.
- **Email verification is off in production** (`PMD_AUTH_REQUIRE_VERIFIED_EMAIL=false`),
  because there is no mail server. So an account's email address is currently unverified.
  Worth mentioning to the lawyer in the context of the account-security clauses in terms §6.
- **Is PMD really free forever?** Terms §3 states it is free with no billing. Verified: no
  payment code, no billing collections, no payment SDK. If a paid tier is ever planned, §3
  and §12.2's cap both need revisiting.
- **Where do these get published?** They need real URLs (e.g. `/privacy`, `/terms`), links
  in the app footer, and links next to the registration checkbox. Markdown files in a repo
  are not a published notice.

---

## Notes for whoever updates these

- Every factual claim traces to the code. If the code changes, the documents are wrong until
  updated. In particular:
  - **avatar file lifetime** — `AccountPrivacyService.deleteAccount()`, `UploadService`,
    `SecurityConfig` (`/uploads/**` permitAll). See blocker 1; five passages depend on this.
  - **export and deletion behaviour** — `AccountPrivacyService` (`exportUserData`,
    `deleteAccount`, `findWorkspacesBlockingDeletion`), `AuthController`
  - **workspace isolation and the platform-admin exception** —
    `WorkspaceService.requireActiveMembership` / `requireWorkspacePermission`
  - **retention numbers** — `AuthSessionRetentionService` (180 days, hardcoded),
    `application.yml` (`pmd.audit.retention.days`, `revoked-retention-seconds`)
  - **session lifetimes** — `application-prod.yml` (12h / 30d remember / 3d inactivity)
  - **cookies** — `AuthSessionService` (`PMD_RT`, `PMD_CSRF`), `AuthCsrfFilter`
  - **the IP/user-agent reduction and its salt** — `ClientMetadataService`,
    `.env.pi.example`, `docker-compose.pi.yml`
  - **the no-tracking claim** — `frontend/pmd-frontend/package.json` (no analytics
    dependency) and the three-origin check against the live site
- Placeholders are marked `[TO BE COMPLETED: ...]` and `[TO BE CONFIRMED ...]`. Grep for
  `TO BE` before publishing; there should be no hits left.
- Resist the urge to make these sound more professional than the service is. The value of
  these drafts is that they are accurate. A policy claiming a security programme that does
  not exist is worse than no policy — and a policy claiming an erasure that does not happen
  is worse still.
