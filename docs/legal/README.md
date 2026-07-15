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

### 1. Processor terms are not accepted

The privacy policy states that transfers to Vercel, Cloudflare and Google rely on SCCs
and/or the EU–US Data Privacy Framework "as applicable". **No DPA has actually been
accepted with any of them.** This must be done, and privacy policy §11 updated to state the
real mechanism per provider rather than a hedge. See lawyer question 5.

### 2. The export omits the terms-acceptance record

**Small, and mechanical to fix.** `termsAcceptedAt` and `termsVersion` were added to the user
document in `687ff16`, but `AccountPrivacyService.exportUserData` was not updated — the commit
does not touch that file. Verified: the `profile` map it builds puts `id`, `email`,
`username`, `displayName`, `firstName`, `lastName`, `bio`, `avatarUrl`, `emailVerified`,
`signedInWithGoogle`, `createdAt` — and stops.

So two pieces of personal data are now held about every new account and are **not** in the
Art. 15 / Art. 20 export. Unlike `passwordHash` and `googleId`, which are left out
deliberately and for stated reasons, this one is an oversight.

Privacy policy §14.1 currently **discloses the gap** rather than pretending otherwise, which
is accurate but is not where this should end up.

**Fix:** two lines in `exportUserData`:

```java
profile.put("termsAcceptedAt", user.getTermsAcceptedAt() != null ? user.getTermsAcceptedAt().toString() : null);
profile.put("termsVersion", user.getTermsVersion());
```

Then delete the "One gap in the export" paragraph from §14.1. **Erasure is already correct** —
the fields live on the user document and nowhere else (verified), and `deleteAccount` calls
`userRepository.deleteById`, so they go with it.

### 3. The two documents contradict each other about backups — and both cannot be right

**Found on this pass. Not yet fixed, because fixing it needs a fact only the developer has.**

- Privacy policy §12 says the Pi is **"the primary and only copy of the database"**.
- Terms §8 grants a licence **"to make backups"**, and ends the licence on deletion *except
  for* **"backup copies, until they age out in the ordinary backup cycle"** — which asserts
  that a backup cycle exists.
- `docs/PRODUCTION_BACKUP_RESTORE_RUNBOOK.md` prescribes a **daily** `mongodump`, retention
  of **14 daily / 8 weekly / 6 monthly**, and storage **"off-host preferred"**.

Those cannot all be true at once, and **whichever way it resolves, something published today
would be false**:

- **If backups are actually being taken:** privacy §12 is false, and worse, the documents are
  silent on things that would then matter a great deal — where the backups physically live
  (off-host could mean another country and another recipient for §11), that §13's retention
  table has no backup row, and that "deletion cannot be undone" (§14.2) coexists with a
  deleted account surviving in an archive for **up to six months**. That last one is a real
  Art. 17 disclosure point, not a technicality.
- **If backups are not being taken:** terms §8's carve-out describes a cycle that does not
  exist, the licence grant to "make backups" is speculative, and the runbook is aspirational
  documentation rather than a description of the service — which is worth knowing separately,
  given that terms §4 tells users hardware failure could lose their data.

There is **no automated backup anywhere in the repo** — no backup service in
`docker-compose.pi.yml`, nothing in CI. So the runbook describes a manual procedure, and
whether it is actually performed is not knowable from the code. **Developer: say which it is,
then one of the two passages gets rewritten and §11/§13/§14.2 updated to match.** No wording
was changed on this pass, because guessing here is exactly the failure mode these documents
exist to avoid.

---

## Resolved since the first draft

- ~~Avatar image files are never deleted~~ — **fully fixed** (commits `bcb73bf` erasure,
  `20b7e0a` replacement), and the six passages that said otherwise have been rewritten.
  Shared logic lives in `AvatarCleanupService.deleteIfUnreferenced`, called from three
  places: `AccountPrivacyService.deleteAccount` (erasure), `AuthController` ~line 347 (user
  replaces photo), `WorkspaceService` ~line 722 (workspace avatar replaced). Three details
  worth keeping, because they are why this is safe: `UploadService.deleteByUrl` accepts
  **only** the exact URL shape `store()` mints (UUID + server-chosen extension), which
  matters because `avatarUrl` is client-supplied and treating it as a path would have traded
  a retention bug for arbitrary file deletion; the reference check skips deletion while any
  user or workspace still points at the URL, which stops someone aiming their `avatarUrl` at
  another user's photo and having it deleted for them; and cleanup runs strictly **after**
  the new value is saved, since a pre-save check would always find the old URL still
  referenced and skip. The documents no longer promise manual deletion by email, because it
  is no longer needed.
- ~~Admin access leaves no record~~ — **fixed** (commit `8e8cbca`); see recommendation R1
  below for what remains. `WorkspaceService.requireActiveMembership` ~line 816 now calls
  `AdminAccessAuditService.recordWorkspaceEntry` when an admin enters a workspace they are
  not an active member of. The entry goes into the workspace's **own hash-chained**
  `workspace_audit_events` log (`prevEventHash`/`eventHash`, SHA-256 in
  `WorkspaceAuditWriter`), action `PLATFORM_ADMIN_ACCESS`, category `SECURITY`. Privacy §9
  and terms §9.1 now describe it **with its limits**, which matter and are easy to overclaim:
  entries collapse to one per admin per workspace per hour (so it shows presence during an
  hour, not per-read granularity and not what was viewed); nothing is recorded when the admin
  is a genuine member; recording failures are swallowed so the request still serves, making
  it best-effort; and it records rather than prevents. Covered by `AdminAccessAuditServiceTest`.
- ~~The registration checkbox must actually exist~~ — **it exists.** `RegisterForm.tsx`
  blocks submission without it, the label links to `/terms` and `/privacy` (new tab, so a
  half-filled form is not lost), and both routes are public in `App.tsx` (~line 1459) and
  render the Markdown from this folder via `?raw`, so the published text and the copy under
  review cannot drift.
- ~~Acceptance is enforced in the browser only, and nothing records it~~ — **fixed** (commit
  `687ff16`). Verified end to end:
  - `RegisterRequest.acceptedTerms` exists and `AuthController.register` ~line 146 calls
    `requireTermsAccepted`, which throws **400**. The field is a **primitive `boolean`**, so
    an omitted field deserialises to `false` and is refused — it fails closed rather than
    defaulting into acceptance. (Had it been a boxed `Boolean`, `null` would have needed
    explicit handling; it does not.)
  - The Google path (~line 198) requires acceptance **only when the sign-in would create an
    account**. An existing user signing in is not re-asked, which is right: blocking them
    would lock them out of their own data.
  - `termsAcceptedAt` (Instant) and `termsVersion` (`CURRENT_TERMS_VERSION`, currently
    `"2026-07-15"`) are stamped on both creation paths, and live on the user document only.
  - `RegisterForm.tsx` does not render the Google sign-up button until the box is ticked —
    which also keeps Google's script, and the contact with Google, out of the page until the
    user has agreed to anything.
  - `TermsAcceptanceIntegrationTest` covers refusal-when-false, refusal-when-omitted, and
    both stamps being recorded.

  Terms §1 now says an account **cannot be created** without acceptance, because that is now
  true of the server rather than only the form. Privacy §4.1 gained the acceptance record as
  an inventory item with basis, balancing and retention; §4.9, §13, §14.1, §14.2 and the
  Art. 21 objection list in §14 were updated to match. The export gap this opened was closed
  in `8c5aa3a`. **One thing this did not resolve:** accounts created before 15 July 2026 have
  no record at all (lawyer question 23).
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

1. **Is the legitimate interests balancing adequate?** **Five** processing activities now rely
   on Article 6(1)(f): keeping evidence of terms acceptance (§4.1), the workspace people
   directory (§4.4), session/sign-in security logging (§4.5), the workspace audit log (§4.6),
   and Turnstile (§4.7). Each states its balancing inline. Is that reasoning sufficient, and
   does a documented LIA need to exist separately from the notice? On the newest one
   specifically: is Art. 6(1)(f) even the right basis for the acceptance record, or is the
   whole thing simply Art. 6(1)(b) — necessary for the contract — since without it there is
   no way to show which contract was formed? §4.1 currently claims both, splitting the act
   from the evidence of it, which may be over-thinking it.
2. **Who is the controller for personal data that a _user_ puts into a workspace?** This is
   the gap the developer originally wanted covered with "we don't process what we don't ask
   for" — which is not true, and is in neither document. Privacy policy §15.1 and terms §8.2
   now allocate the **practical** responsibility honestly: the user (or the employer they
   act for) decides what third-party personal data goes in and why; the operator decides
   security, access, retention, processors, and answering rights requests. Both deliberately
   **stop short of claiming a formal label**, because each label drags different duties
   behind it:
   - If the operator is **sole controller** for that content, he owes Art. 13/14 duties to
     people he has never heard of and cannot contact.
   - If he is a **processor** for it, Art. 28 requires a written controller–processor
     contract with every user who is a controller. **No DPA with users exists, and the Terms
     are not one.** If this is the right answer, one must be written — and a consumer using
     a free tool for personal projects cannot sensibly be a controller signing a DPA, so the
     answer may differ between business and consumer users of the same service.
   - If they are **joint controllers**, Art. 26 requires an arrangement and its essence made
     available to data subjects.

   Which is it? Does it split by user type? And what does the answer oblige the developer to
   write or build? Note that the household exemption (Art. 2(2)(c)) probably does not rescue
   a consumer here, since a shared multi-user workspace is not purely personal activity.
   **This is the question most likely to change what these documents have to say**, and it
   is why §15.1 says the label is open rather than guessing at one.
3. **The `people` collection and Article 14.** A workspace can hold directory entries
   (display name + email, per workspace) describing people who are **not PMD users** and who
   were never told. Most are fictional demo seed data. **Correction since the last pass:**
   an earlier version of this note said "an administrator can create real ones", which
   implied a workspace administrator. It is narrower than that — `PersonController`
   create/update/delete all require `accessPolicy.isAdmin(requester)`, which is
   `user.isAdmin()`, the **platform** admin. A workspace's own owner cannot create a
   directory entry; only the operator can. Reads only require workspace membership. So any
   real entry is the operator's own act as controller, which probably makes the Art. 14 duty
   *harder* to wave away, not easier. Does it bite, does the "disproportionate effort"
   exemption in Art. 14(5)(b) apply at this scale, and should the feature be dropped instead
   — given that the only person who can use it is the one person who could also just not?
4. **Is "pseudonymous, not anonymous" the right characterisation?** §5 deliberately does
   *not* claim the /24-masked IP plus salted hash falls outside the GDPR, because it is
   stored next to a user id (Art. 4(5), Recital 26). Confirm this is right, and that
   describing it as "anonymized" in the repo-root `README.md` is an overstatement that
   should be corrected for consistency.
5. **The three providers' roles and the transfer mechanism.** Vercel and Cloudflare are
   described as processors; Google as an independent controller for the sign-in. Correct —
   particularly for Cloudflare (CDN + Turnstile might split)? Which mechanism applies to
   each: SCCs, the EU–US DPF, or both? Is a transfer impact assessment needed at this scale?
   See blocker 1.
6. **Is an Article 30 record of processing activities required?** The Art. 30(5) exemption
   for organisations under 250 people does not apply where processing is not occasional —
   and running a live service is not occasional. So it probably *is* required despite being
   a one-person operation. Confirm, and confirm what a proportionate record looks like here.
7. **Is a cookie banner needed?** The position taken is no: only `PMD_RT` and `PMD_CSRF` are
   set, both strictly necessary for authentication, no analytics, no advertising. Turnstile
   and Google may set cookies in their own contexts when used. Confirm this holds under the
   Greek implementation of the ePrivacy Directive and current Hellenic DPA guidance —
   particularly whether the Turnstile cookie counts as strictly necessary.
8. **The avatar disclosure** (§8). Files are now deleted on erasure *and* on replacement, so
   the retention gap is closed. What remains: is serving avatars from an **unauthenticated**
   UUID URL defensible at all, or does it need a permission check? §8 argues the URL's
   secrecy is the only protection and says so plainly. Is "we deleted the file, but any copy
   that leaked while it was live is beyond us" an adequate answer to an erasure request about
   a photograph?
9. **The platform administrator disclosure** (§9, terms §9.1).
   `WorkspaceService.requireActiveMembership` ~line 805 builds a synthetic OWNER
   `WorkspaceMember` when `user.isAdmin()`; it is never persisted, so he never appears in the
   member list. **Entry is now recorded** (commit `8e8cbca`) in the workspace's own
   hash-chained audit log, so the disclosure is no longer "trust me". The questions that are
   left are about sufficiency, not existence:
   - Is a **presence record** — one entry per admin per workspace per hour, showing that he
     was in there but not what he read — sufficient for an operator with owner powers over
     everyone's data? Or is per-access detail required?
   - Is the **un-recorded elevation** acceptable? An admin who is a genuine member (even as a
     *viewer*) is silently raised to OWNER with no entry written. §9 discloses this. Is
     disclosure enough, or must it be recorded or removed? See R1.
   - Does the legitimate-interests analysis in §4.6 now need to cover this as its own
     processing activity, given the log records the operator's own movements as well as
     members' actions?
   - Best-effort recording (failures swallowed to keep the request serving): acceptable?
10. **The deletion carve-out** (§14.2). Content authored in other people's workspaces survives
    account deletion and stops resolving to a name. Is that defensible under Article 17, and
    is the stated justification (other members' legitimate interests in their own workspace
    records) the right one? Is the case-by-case email fallback sufficient? **Also now
    disclosed in §14.2:** two residues the sweep does not catch — `workspace_invites`
    retains the `invitedEmail` somebody typed (nothing expires invites; they die only with
    the workspace), and `workspace_invite_accepted_digest` retains `joinedUserName`. Both are
    plaintext personal data about a user who has erased their account. Do they need to be
    erased automatically rather than on request?
11. **Retention periods.** 365 days for audit events, 180 days for sign-in security events,
    30 days for revoked sessions. Justifiable, or does any need shortening? The 180-day
    figure is hardcoded in `AuthSessionRetentionService`, not configurable.
12. **The failed-login email record.** `auth_security_events` stores the email address
    entered in a failed sign-in attempt, including for addresses with no account — i.e.
    personal data about people who are not users. Any Article 14 obligation? Is the
    retention appropriate?
13. **Breach notification.** §18 commits to the Article 33 72-hour notification. Can a
    one-person operation realistically meet this, and should the policy describe a process
    rather than just a promise?

### Terms of use

14. **The liability cap** (§12.2). Greater of amounts paid (currently zero) or EUR 100. Is a
    cap of this shape enforceable against a Greek/EU consumer? Is a monetary cap appropriate
    at all for a free service, or does it risk being struck as an unfair term — taking the
    rest of the clause with it?
15. **Are the §12.1 carve-outs complete and correctly worded?** Death/personal injury, fraud,
    gross negligence (βαριά αμέλεια), wilful misconduct (δόλος), mandatory consumer rights.
    Anything missing under Greek law? Are the Greek terms used correctly?
16. **The data-loss limitation** (§12.2). It excludes liability for data loss except where
    caused by gross negligence or wilful misconduct, backed by the honest warning in §4. Is
    that enforceable given that the operator *knows* the hosting is unreliable and has said
    so? Does saying so plainly help or hurt?
17. **Governing law and jurisdiction** (§15). Greek law, Greek courts, with the consumer
    carve-out for mandatory home-country rules (Rome I Art. 6). Correct? **Which specific
    court should be named?** — still a placeholder.
18. **The ODR platform.** The EU ODR platform shut down in July 2025. The draft flags this
    rather than linking a dead platform. What, if anything, is now required in its place?
19. **The content licence** (§8). Drawn narrowly enough to be fair while still covering what
    a server actually has to do (host, copy, transmit, display, back up)?
20. **The indemnity** (§13) and the warranty behind it (§8.2). The **warranty** — that you
    have a lawful basis for third-party personal data you put in — is asked of everyone. The
    **indemnity** is business-only, and conditioned on prompt notice, no settlement without
    asking, a duty to mitigate, and a carve-out for the developer's own fault. Is it
    enforceable and proportionate, or still too broad? PMD is free and run by one person, so
    a clause broad enough to be worth having may also be broad enough to be struck down under
    Directive 93/13 — and an unenforceable indemnity protects nobody. Should the warranty
    itself be softened for consumers? Partly depends on question 2.
21. **Age 16** (terms §5, privacy policy §17). Chosen as a conservative default; the
    developer has not decided. Greece has set its own digital-consent age under Art. 8(1)
    GDPR and it is understood to be lower than 16 — confirm rather than assume. Note that
    Art. 8 only bites where consent is the basis, and here the basis is contract, so the
    real question may be capacity to contract rather than Art. 8 at all. What should the
    number be, and on what reasoning?

### Both

22. **Is the registration checkbox the right acceptance mechanism?** A **single** tick at
    registration accepts the Terms *and* confirms the Privacy Policy has been read. It is now
    genuinely enforced: the server refuses account creation without it, on both the password
    and Google paths, and records when and which version. So the "is it real?" half of this
    question is answered — what is left is whether the *shape* is right:
    - Is one tick enough to incorporate the terms, or should the two documents be **split
      into separate ticks**?
    - Should the Privacy Policy be **acknowledged at all**? It is a notice, not something to
      agree to, and asking someone to "accept" it risks blurring exactly the
      contract/consent line that §4.9 works to keep clean.
    - The version stamp is a **date string** (`"2026-07-15"`), set by a constant in
      `AuthController`. Is that adequate provenance, or does the accepted text itself need to
      be archived, so "version 2026-07-15" can be produced years later? The Markdown is in
      git, which may or may not be an acceptable answer.
23. **Existing accounts have no acceptance record, and the terms are not yet in force.** Two
    facts that interact, and the developer has deliberately not decided this alone:
    - Accounts created before 15 July 2026 have `termsAcceptedAt` null. **Null means
      unrecorded, not refused** — there is no back-fill, and privacy policy §4.1 says so
      plainly.
    - These documents are still **drafts, not in force**. Nobody has yet accepted anything
      that binds them, including the users who have ticked the box since `687ff16`.

    So: when the reviewed terms do go live, **must existing users be asked to accept them
    afresh**, and must users who accepted a draft version be re-asked? If yes, that is a
    feature (a re-acceptance prompt), not a wording change, and it needs building. Relatedly:
    does the notice-of-material-change machinery in terms §14 / privacy §19 do this job, or
    is first-time-in-force a different event from a change?
24. **Language.** Both documents are in English. The service is operated from Greece and may
    have Greek users. Is a Greek translation required, or advisable? If both exist, which
    governs?
25. **The changes clauses** (privacy policy §19, terms §14). Both promise advance notice of
    material changes and commit to purposes staying limited to operating PMD. Is the wording
    strong enough to avoid the unfair-terms problem under Directive 93/13 Annex 1(j) with a
    unilateral variation right?
26. **Anything material that is simply missing.** These were written by a developer working
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

- **The age threshold** — 16 is a placeholder pending question 21.
- **The competent court** — placeholder in terms §15, pending question 17.

### C. Recommendations — technical, not textual

These are the developer's own calls, not the lawyer's. They are listed because in each case
**the document is currently carrying weight that the code should be carrying.**

#### R1. Admin access is now logged — what is left is narrowing it

**The logging half of this recommendation is done** (commit `8e8cbca`, see Resolved). Break-
glass entry is recorded in the workspace's own hash-chained log, which is a genuinely
stronger position than the disclosure-only one the drafts had before: the claim is now
checkable by the people it is made to, and the chain means the operator cannot quietly edit
it out. §9 and terms §9.1 have been rewritten to say so — **and to say what it does not
cover**, which is the part worth defending against future tidying-up:

1. **The un-recorded elevation.** An admin who *is* a genuine member of a workspace is
   silently raised to `OWNER` regardless of the role that workspace actually gave him
   (`requireActiveMembership` sets `WorkspaceMemberRole.OWNER` unconditionally on the
   `isAdmin` branch), and **no entry is written**, because `isRealMember` is true. So a
   workspace that invited the operator as a *viewer* sees a viewer in its member list and has
   no indication he is operating as owner. This is disclosed in §9, but disclosure is again
   the floor: consider recording elevation, or honouring the role the workspace actually
   granted and requiring explicit break-glass to exceed it.
2. **Narrowing the power itself.** The synthetic OWNER membership is still granted for
   *every* workspace on *every* request where `isAdmin` is true. Logging makes it visible; it
   does not make it smaller. Consider scoping or time-boxing it, or requiring an explicit
   "enter workspace" action that is itself the recorded event — which would also remove the
   need for the hourly collapse.
3. **Best-effort recording.** Failures are swallowed so the request still serves. That is the
   right trade for availability, but it means the log is not a guarantee, and §9 says so.
   Consider alerting on a failed audit write, so a silent gap is not invisible.

Do not let the documents drift into implying per-read granularity or a guarantee. They
currently do not, deliberately.

#### R2. The demo seeder can mint a known-password admin

Not currently a live problem, and **not** disclosed in the documents because it is not true
of production — but worth knowing before it becomes true. `DemoSeeder` creates
`admin1@pmd.local` with the hardcoded password `admin321` and `isAdmin = true`. It is gated
on `PMD_SEED_DEMO=true` or the `dev` profile; production runs `docker,prod` and does not set
the flag, so it does not run. `UserSeeder` is safer still — it seeds nothing unless
`PMD_SEED_ADMIN_PASSWORD` is explicitly set, and has no default password.

The point: privacy policy §9 states that **the only platform administrator is the developer**.
That is a claim about the production database, not about the code, and the code has a switch
that would falsify it. If `PMD_SEED_DEMO` is ever turned on in production, §9 becomes false
and every workspace is reachable with a published password. Consider failing startup if
`PMD_SEED_DEMO` is true while the `prod` profile is active.

### D. Operational

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
- **Where do these get published?** Mostly done: `/privacy` and `/terms` are public routes
  and render these files directly, and the registration checkbox links to both. Still
  missing: **links in the app footer**, so a user who is already signed in can find them
  without knowing the URL.

---

## Notes for whoever updates these

- Every factual claim traces to the code. If the code changes, the documents are wrong until
  updated. In particular:
  - **avatar file lifetime** — `AvatarCleanupService.deleteIfUnreferenced` and, decisively,
    **who calls it** (erasure, user profile update, workspace settings — if a call is ever
    dropped, a retention gap silently reopens); `UploadService.deleteByUrl`; `SecurityConfig`
    (`/uploads/**` permitAll). Six passages depend on this: privacy §1, §8, §13, §14.2 and
    terms §8.1, §11.2.
  - **export and deletion behaviour** — `AccountPrivacyService` (`exportUserData`,
    `deleteAccount`, `findWorkspacesBlockingDeletion`), `AuthController`. **When a field is
    added to `User`, it must be added to `exportUserData` too** — that is precisely how
    blocker 2 happened, and the export silently omits rather than failing.
  - **terms acceptance** — `AuthController` (`requireTermsAccepted`, `stampTermsAcceptance`,
    `CURRENT_TERMS_VERSION`), `RegisterRequest.acceptedTerms` / `GoogleLoginRequest`,
    `User.termsAcceptedAt` / `termsVersion`. Terms §1 and privacy §4.1, §4.9, §13, §14.1,
    §14.2 depend on this. **If `CURRENT_TERMS_VERSION` is bumped, check what the documents
    say about older accounts** — and note that the constant changing is not the same as the
    terms coming into force.
  - **workspace isolation and the platform-admin exception** —
    `WorkspaceService.requireActiveMembership` (~line 805, the `isAdmin` branch) /
    `requireWorkspacePermission`. Privacy §9 and terms §9.1 depend on this.
  - **what the admin-access record does and does not show** — `AdminAccessAuditService`
    (`DEDUPE_WINDOW` = 1 hour; failures swallowed) and the `isRealMember` guard in
    `requireActiveMembership`. Privacy §9 and terms §9.1 state the hourly collapse, the
    member exemption, the un-recorded elevation, and best-effort recording **as limits**. If
    `DEDUPE_WINDOW` changes, or the guard changes, those passages are wrong. Do not "tidy"
    the limits out of the prose — they are the difference between a disclosure and a boast.
  - **the audit log's hash chain** — `WorkspaceAuditWriter` (`prevEventHash`/`eventHash`,
    SHA-256). Privacy §4.6 and §9 claim tamper-evidence on the strength of it.
  - **who can read the audit log** — `WorkspaceAuditService.list` requires `VIEW_STATS` for
    anything beyond your own actions, and `viewStats` is `true` in **all four** default role
    presets (`WorkspaceRolePermissions`), so by default every member can read it. Privacy
    §4.6 says exactly that, including that a workspace can change it via role permissions.
    An earlier draft said "visible to that workspace's administrators", which understated it.
  - **who can create a `people` entry** — `PersonController` + `AccessPolicy.isAdmin`
    (= platform admin, *not* workspace admin). Privacy §4.4 depends on this.
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
