# PMD — Privacy Policy

> **Draft. Not legal advice.**
> This document was written by PMD's developer, who is not a lawyer. It is an honest
> attempt to describe what the software actually does, written by reading the source
> code. It has not been reviewed by a qualified lawyer. It should be reviewed by one
> before it is published or relied on. The open questions are listed in
> [`README.md`](./README.md) in this folder.

**Last updated:** 15 July 2026
**Status:** Draft — not yet in force.
**Applies to:** the PMD web application at <https://pmd.olamov.com>.

---

## 1. Summary

PMD is a small project management tool run by one independent developer. It is in a
soft launch and has few users.

The short version:

- PMD stores the account and the work you put into it. That is the point of the service.
- PMD asks you for very little: an email address and a name. A bio and a photo are
  optional.
- There is no analytics, no advertising, and no tracking of any kind. This is not a
  marketing claim; the site loads code from exactly three places (itself, Google's
  sign-in service, and Cloudflare's anti-bot widget) and no others.
- Your full IP address is never written to the database. It is reduced before storage.
- Your workspaces are separate. People who are not in your workspace cannot see what is
  in it, and cannot browse your details.
- The database is not on a cloud provider. It is on a Raspberry Pi in the developer's
  home in Greece.
- Avatar images are served from a public URL. Anyone with the link can open one, without
  signing in — and the image file is not deleted when you delete your account. See
  section 8.
- You can export everything PMD holds about you, and delete your account, from the app.
- Your data is not sold, rented, or shared for anyone else's marketing.

The rest of this document is the detail.

## 2. Who is responsible for your data

The data controller is:

- **Name:** Ioannis Dimos (Ιωάννης Δήμος), acting as an individual
- **Country:** Greece (EU)
- **Email:** dimos.is.dev@gmail.com

PMD is operated by one person, in his own name. There is no company behind it, no legal
department, and no data protection officer.

A DPO is not appointed because PMD does not appear to meet the conditions in Article 37
GDPR: it is not a public authority, its core activity is not large-scale regular and
systematic monitoring of people, and it does not process special categories of data on a
large scale. [TO BE CONFIRMED BY A LAWYER.]

For anything in this policy, write to the email above. That is the contact point, and it
is read by the controller himself.

## 3. What this policy covers

This policy covers the PMD web application and its backend API. It does not cover any
third-party site you reach by clicking a link from PMD, and it does not cover what Google
or Cloudflare do with data you give them directly in their own contexts (see section 11).

## 4. What data PMD holds, why, and the legal basis

### 4.1 Your account and profile

**What:** your email address (which is also your login identity), a BCrypt hash of your
password, your first and last name, display name, avatar image, free-text bio, the team
and workspaces you belong to, whether your email is verified, whether you are an admin,
your account creation date, and a list of user ids who have recommended you.

Your password itself is not stored — only a BCrypt hash of it, which cannot practically
be turned back into the password.

**Why:** to create your account, sign you in, show you to your colleagues, and run the
service.

**Legal basis:** performance of a contract (Article 6(1)(b) GDPR). You asked for an
account; PMD cannot provide one without this data.

### 4.2 Sign in with Google (optional)

**What:** if you choose to sign in with Google, PMD stores your Google account subject id
(`googleId`) alongside your account, so it can recognise you next time. PMD receives your
email address and basic profile details from Google as part of that sign-in.

**Why:** so you can sign in without a PMD password.

**Legal basis:** performance of a contract (Article 6(1)(b) GDPR) — this is the sign-in
method you chose. If you do not use Google sign-in, no `googleId` is stored and Google is
not involved in your account.

### 4.3 The content you create

**What:** the projects, tasks, comments, workspaces, memberships, invitations, join
requests, mentions and preferences you create, together with the user id of whoever
created each item.

**Why:** this is the service.

**Legal basis:** performance of a contract (Article 6(1)(b) GDPR).

This content is visible to the other members of the workspace it lives in — see section 9.

### 4.4 Workspace people directory

**What:** each workspace can hold a directory of people, with a display name and an email
address, scoped to that workspace. Most of these entries are the fictional sample records
described in section 10. Others can be created by an administrator.

**Why:** so a workspace can refer to people in projects and assignments.

**Legal basis:** legitimate interests (Article 6(1)(f)) — running a workspace directory for
that workspace's own members.

**The balancing:** the interest is letting a workspace keep a list of the people its work
involves. It is limited to a name and an email address, it is visible only inside that one
workspace (section 9), and it is not used for anything else — no messaging, no enrichment,
no lookups against other sources.

If a directory entry describes **you** and you did not create it, you still have every
right in section 14 over it, including the right to object and to have it erased. Write to
the email in section 2.

### 4.5 Sessions and sign-in security

**What:** for each active session — your user id, a hashed version of your session
(refresh) token, a reduced IP address and a reduced browser identifier (see section 5),
and timestamps for created, expires, last used and revoked. PMD also records sign-in
security events: the event type (login, logout, refresh, Google sign-in), whether it
succeeded or failed, the user id, the email address used in the attempt, the same reduced
IP and browser identifier, and a short message.

The email address in a failed sign-in event is recorded even if no such account exists,
because that is what a failed attempt consists of.

**Why:** to keep you signed in, to let you see and end your own sessions, to enforce a
limit of 10 concurrent sessions per account, to rate-limit and lock out brute-force
attempts, and to be able to investigate if an account is attacked.

**Legal basis:** performance of a contract for keeping you signed in (Article 6(1)(b)),
and legitimate interests for the security logging (Article 6(1)(f)).

**The legitimate interests balancing, stated openly:** the interest is keeping accounts
from being broken into — which is also your interest. The processing is necessary because
there is no way to detect a password-guessing attack without recording the attempts. It is
limited: full IP addresses and full browser strings are never stored; the data is used
only for security, never to profile you, target you, or measure your behaviour; it is
deleted on a fixed schedule (section 13), and immediately if you delete your account. You
can see and revoke your own sessions in the app. A person signing into an account-based
service would reasonably expect it to keep a sign-in log. On that basis the developer's
view is that this processing does not override your interests or rights. If you disagree,
you can object — see section 14.

### 4.6 Workspace audit log

**What:** for actions inside a workspace — who did it (actor user id and name), who it was
done to (target user id), the action, its category, the outcome, and the relevant
workspace, team, role and project ids.

**Why:** so a workspace owner can see who changed roles, removed members, or altered
projects. Shared workspaces need accountability, otherwise changes are untraceable.

**Legal basis:** legitimate interests (Article 6(1)(f)).

**The balancing:** the interest is accountability inside a shared workspace. It is
necessary because a shared workspace without a record of administrative actions cannot be
governed by its owner. It is limited to administrative and membership actions with a
365-day life; it contains no content, no IP addresses and no browsing behaviour; and it is
visible to that workspace's administrators, not to the public and not to other workspaces.
Someone joining a shared workspace would reasonably expect their administrative actions
there to be recorded. On that basis the developer's view is that this processing does not
override your interests or rights. You can object — see section 14.

### 4.7 Anti-bot check (Cloudflare Turnstile)

**What:** when you register or sign in, Cloudflare Turnstile runs a bot check in your
browser. Cloudflare processes signals from your browser to decide whether you are a bot,
and returns a token that PMD's backend verifies with Cloudflare. PMD does not receive or
store those signals — only the pass/fail result.

**Why:** to stop automated account creation and credential-stuffing attacks.

**Legal basis:** legitimate interests (Article 6(1)(f)).

**The balancing:** the interest is preventing automated abuse of a small service that has
no capacity to absorb it. It is necessary because a sign-in form with no bot protection
gets attacked. It is limited: the widget only appears on the registration and sign-in
forms, not across the site, and it is not used for analytics or advertising. Bot
protection on a login form is expected. On that basis the developer's view is that it does
not override your interests or rights.

### 4.8 Email verification and notifications

**What:** email verification tokens, and your notification preferences.

**Why:** to confirm you own the email address, and to respect your notification settings.

**Legal basis:** performance of a contract (Article 6(1)(b) GDPR).

PMD's code can send transactional emails (email verification, workspace invitations,
overdue reminders). **During the soft launch no outgoing mail server is configured, so
these emails are not currently being sent.** If that changes, this policy will be updated
to name the email provider before any mail is sent.

PMD does not send marketing email.

### 4.9 Where consent comes in

Right now, nowhere. PMD does not currently rely on consent as the legal basis for anything
described in this policy, because everything above is either necessary to provide the
account you asked for, or a security measure justified under legitimate interests. The two
cookies PMD sets are strictly necessary for signing in, so they do not require consent.

**One point worth being precise about.** When you register, you tick a box to accept the
[Terms of Use](./terms-of-use.md) and to confirm you have read this policy. That tick is
**contractual acceptance of the terms. It is not GDPR consent**, and PMD does not treat it
as consent. The legal basis for running your account is the contract itself (Article
6(1)(b)), not that checkbox. The distinction matters in both directions: it means the
processing described above does not hang on a permission you might later withdraw, and it
means PMD cannot point at that checkbox to justify anything beyond what is written in this
policy.

If PMD ever adds something that genuinely needs consent — marketing email, optional
analytics, anything non-essential — it will ask you separately and plainly, and you will
be able to say no, and to withdraw later, without losing access to the service.

## 5. How your IP address and browser are handled

This one is worth stating precisely, because most services do the opposite.

Your full IP address is **never written to the database**. Before anything is stored:

- Your IP address is **masked to its /24 network** for IPv4 (so `203.0.113.47` becomes
  `203.0.113.0/24`) or to a truncated prefix for IPv6, and stored together with a short
  **salted** SHA-256 hash. The salt is a 64-character random secret that lives only in the
  server's configuration and is never stored in the database. The stored value looks like
  `anon:203.0.113.0/24|fp:1a2b3c4d5e6f`.
- Your user-agent string is reduced to a **browser family plus the same kind of salted
  hash** — for example `anon:mozilla|fp:9f8e7d6c5b4a`. The full string is not kept.

The short hash exists so that two events from the same device can be recognised as
related, which is what makes an attack visible. Because it is salted with a secret that is
not in the database, someone who obtained a copy of the database could not work backwards
from the hash to your IP address.

Two honest caveats:

1. This data sits next to your user id, so it is still linked to you. It is
   **pseudonymous, not anonymous**, and this policy treats it as personal data throughout.
   Reducing it limits the damage if it leaks; it does not make it stop being about you.
2. The code has a configuration switch that could store raw values instead. **It is off in
   production**, and the deployment now refuses to start unless a salt is configured. If
   the switch were ever turned on, this policy would be updated first.

There was also a one-off migration (`2026-02-26-client-metadata-redaction-v1`) that went
back and reduced IP addresses and user-agent strings that had been stored in full by an
earlier version of PMD. Those raw values are gone.

Raw IP addresses do exist briefly in memory while a request is being handled — they have
to, or the server could not reply to you — and are used for in-memory rate limiting that
expires within minutes. They are not written to disk by PMD. Cloudflare, which sits in
front of PMD, sees your real IP address as part of delivering your traffic; that is
Cloudflare's own processing (section 11).

## 6. What PMD does not do

- **No analytics.** There is no Google Analytics, no Vercel Analytics, no Plausible, no
  PostHog, no Sentry, no product analytics of any kind. The frontend has no analytics
  package installed.
- **No advertising and no tracking pixels.** None. PMD does not have an advertising
  business, and there is no third-party tracker on the site.
- **No profiling and no automated decision-making** that produces legal or similarly
  significant effects about you (Article 22 GDPR).
- **No selling or renting of your data**, and no sharing of it for anyone else's marketing.
- **No reading of your project content** for any purpose other than running the service.

The live site loads resources from exactly three origins: PMD itself,
`accounts.google.com` (only if you use Google sign-in), and `challenges.cloudflare.com`
(the anti-bot widget). This was checked against the running site, not just the code.

## 7. Cookies

PMD sets **two first-party cookies**, both strictly necessary for signing in:

| Cookie | What it is | Properties |
| --- | --- | --- |
| `PMD_RT` | Your refresh-session token. This is what keeps you signed in. | `HttpOnly`, `Secure`, `SameSite=Lax`, scoped to `/api/auth` |
| `PMD_CSRF` | A CSRF double-submit token, used to prove a request came from PMD's own pages and not from another site. | `Secure`, `SameSite=Lax`, scoped to `/`, and deliberately readable by PMD's own JavaScript — that is how double-submit works |

Your short-lived access token (15 minutes) is kept **in memory only**. It is never written
to a cookie, to `localStorage`, or to `sessionStorage`. It is gone when you close the tab.

Both cookies are strictly necessary to provide a service you asked for, so under the
ePrivacy rules they do not require a consent banner. PMD sets **no analytics cookies and
no advertising cookies**, which is why you are not being asked to click through a cookie
banner. [TO BE CONFIRMED BY A LAWYER — see `README.md`.]

Google and Cloudflare may set their own cookies in their own contexts when you use Google
sign-in or when the Turnstile widget runs. Those are governed by their policies, linked in
section 11.

## 8. Avatar images are served from a public URL

This needs to be said plainly rather than buried.

When you upload an avatar, it is stored as a file on the Raspberry Pi and served from a
URL like `/uploads/3f9a2b7c-....png`. **That URL is not behind authentication.** Anyone who
has the link can open the image without signing into PMD.

The filename is a randomly generated UUID, so the URL cannot realistically be guessed, and
the images are not listed or indexed anywhere. But the protection is the secrecy of the
URL, not a permission check. If a URL leaks — if you paste it somewhere, or it ends up in
a browser history or a proxy log — the image is reachable by whoever has it.

**And the part that matters most:** the image file is **not deleted when you delete your
account**, and it is not deleted when you replace your avatar with a different one. The
file stays on the disk, at the same public URL. Deleting your account removes the record
that says the photo is yours, but it does not remove the photo.

This is a known gap. It is written down here rather than glossed over, it is tracked as a
blocker in PMD's own repository, and it is being fixed. Until it is:

**Treat your avatar as a permanently public photo. Do not upload an image you would not be
comfortable with a stranger seeing, or one you might later want recalled.** If you have
already uploaded one and want the file removed from the disk, email the address in section
2 and it will be deleted by hand.

Only JPEG, PNG and WebP files up to 2 MB are accepted, and the actual file bytes are
checked, not just the filename.

## 9. Who can see your data inside PMD

PMD is built around workspaces, and they are genuinely separate from each other.

- **Your workspace data is visible to the members of that workspace**, according to the
  role you were given. Not to anyone else.
- **People who are not members of a workspace cannot reach it at all.** Every endpoint
  checks your membership before returning anything. A non-member does not even get a
  "denied" message that would reveal the workspace exists — the request simply comes back
  as "not found".
- **A workspace administrator's powers stop at the edge of their own workspace.** Being an
  admin of one workspace gives no visibility into any other workspace, and no ability to
  browse users who are not in theirs.
- **Other users cannot browse your profile, your bio, or your activity** unless they share
  a workspace with you.

This was checked in a security review of every endpoint, which found no way to read across
workspace boundaries.

**The one exception, stated plainly:** PMD has a **platform administrator** role, held by
the operator. A platform administrator can enter any workspace with owner-level
permissions, in order to run the service — investigate a fault, deal with abuse, or recover
a broken workspace. Today the only platform administrator is the developer named in section
2. This is not a back door hidden from you; it is the ordinary reality of a hosted service
having an operator, and this policy is not going to pretend otherwise. That access is not
used to read your project content for any other purpose.

## 10. Demo content in new accounts

When you create an account, PMD seeds a demo workspace with sample people, teams and
projects, so the app is not empty on your first visit. Those sample people are fictional
and were made up by the developer. They are not real people, and they are not other users'
records. You can delete the demo workspace.

## 11. Who else is involved, and where they are

PMD is deliberately small, but it does not run entirely alone.

| Who | What they do for PMD | Where | Their terms |
| --- | --- | --- | --- |
| **Vercel Inc.** | Hosts the React frontend (the HTML, CSS and JavaScript) and proxies API calls to the backend. | United States | <https://vercel.com/legal/privacy-policy> |
| **Cloudflare, Inc.** | Sits in front of PMD as CDN and edge network, and provides the Turnstile anti-bot check. All backend traffic passes through an encrypted Cloudflare Tunnel. | United States | <https://www.cloudflare.com/privacypolicy/> |
| **Google Ireland Ltd / Google LLC** | Provides "Sign in with Google", only if you choose to use it. | United States / Ireland | <https://policies.google.com/privacy> |

Vercel and Cloudflare act as **processors** — they handle data on PMD's instructions to
deliver the service. Google's role in a sign-in is different: when you sign in with your
own Google account, Google is processing your data as its **own controller** under its own
policy, and PMD receives the result. [TO BE CONFIRMED BY A LAWYER — the exact
characterisation of each of these three is a question for review; see `README.md`.]

Container images are stored on GitHub Container Registry. That is a build-time artefact
store; no user data goes there.

**International transfers.** All three are US-based companies, so your data reaches the
United States. Transfers are made on the basis of the safeguards these providers offer for
EU personal data — Standard Contractual Clauses and/or the EU–US Data Privacy Framework, as
applicable to each. [TO BE COMPLETED AND CONFIRMED: the developer must confirm which
mechanism applies to each provider and accept each provider's data processing terms. This
is listed as an open item in `README.md` and is not yet done.]

PMD does not disclose your data to anyone else, except where the law requires it. If a
lawful request ever arrives, the developer will comply only to the extent legally required,
and will tell you unless prohibited from doing so.

## 12. Where your data is stored

The MongoDB database and the uploaded avatar files are on a **Raspberry Pi 4 in the
developer's home in Greece**. That is the primary and only copy of the database.

The Pi has no ports open to the internet. It reaches the outside world through an
outbound-only encrypted Cloudflare Tunnel, and the database container is on an internal
network that has no route to the internet at all.

So: your project data physically lives in Greece, in the EU. Only the frontend assets and
the traffic path involve US providers.

Please read section 4 of the Terms of Use alongside this. A Raspberry Pi at home is not a
data centre, and you should not treat PMD as the only copy of anything important.

## 13. How long data is kept

| Data | Kept for |
| --- | --- |
| Your account, profile and bio | Until you delete your account |
| Your avatar **image file** | **Indefinitely** — it is not deleted when you delete your account; see section 8 |
| Your content (projects, tasks, comments) | Until you or your workspace delete it — see section 14 |
| Active sessions (`auth_sessions`) | Until they expire; expired sessions are removed by an hourly cleanup |
| Revoked sessions | **30 days** after revocation |
| Sign-in security events (`auth_security_events`) | **180 days** — or immediately, if you delete your account |
| Workspace audit events (`workspace_audit_events`) | **365 days** |
| A deleted workspace's data | Purged **30 minutes** after deletion is confirmed (a grace period, so an accidental deletion can be cancelled) |

Session lifetimes in production:

- A normal session lasts **12 hours**.
- "Stay signed in" extends it to **30 days**.
- Any session is dropped after **3 days of inactivity**.
- The in-memory access token lasts **15 minutes** before it is refreshed.

## 14. Your rights

Under the GDPR you have the right to:

- **Access** your data — get a copy of it and be told what is being done with it.
- **Rectify** it — fix anything inaccurate. Most of it you can edit yourself in Settings.
- **Erase** it ("right to be forgotten") — see below.
- **Restrict** processing — ask for processing to be paused while a dispute is sorted out.
- **Portability** — get your data in a structured, machine-readable format.
- **Object** to processing based on legitimate interests (sections 4.4, 4.5, 4.6 and 4.7),
  on grounds relating to your situation. If you object, the processing stops unless there
  are compelling legitimate grounds that override your interests. For security logs there
  usually are, since without them accounts cannot be protected — but the objection will be
  considered properly and you will get a reasoned answer.
- **Withdraw consent** at any time, where consent is the basis. As section 4.9 explains,
  PMD does not currently rely on consent for anything.

### 14.1 Doing it yourself, in the app

Both of these are on your profile page, under **"Your data"**:

- **Export** (`GET /api/auth/me/export`) — downloads a JSON file containing your profile,
  workspace memberships, sessions, security events, notification and panel preferences,
  join requests, comments you authored, projects you are a member of, and the audit trail
  entries where you are the actor or the target. Your password hash and your Google id are
  deliberately left out: they are secrets that would only create risk sitting in a
  downloaded file, and neither tells you anything useful.
- **Delete your account** (`DELETE /api/auth/me`) — erases the account.

### 14.2 What deletion actually does

**Deleted outright:** your user record, your sessions, your email verification tokens, your
notification preferences, your panel preferences, your mention restrictions, your workspace
memberships, your join requests, your sign-in security events, and any people directory
entry matching your email address.

**Stripped of your identity but kept:** records inside other people's data that merely
referenced you. The reference is removed — "created by" fields are cleared, and you are
pulled out of project member lists — while the record itself survives. In the workspace
audit log, your name is replaced with **"Deleted user"**.

**Not deleted: your avatar image file.** See section 8. This is a known gap, not a policy
choice. Email the address in section 2 and it will be removed by hand.

**One honest limit.** Content you authored inside *other people's* workspaces — comments,
projects, task history — is not deleted with your account. It stays, and it stops resolving
to your name, showing as "Deleted user" instead. This is because that content belongs to a
shared workspace that other people are still using, and pulling it out would tear holes in
their records. If you want that content removed as well, email the address in section 2 and
it will be handled case by case.

**One thing deletion will refuse to do.** If you are the only person who can manage a
workspace that still has other members in it, deletion is blocked until you hand that
workspace over to someone else or delete it — otherwise those members would be stranded in
a workspace nobody can administer. You will be told exactly which workspaces are in the
way.

Deletion cannot be undone. Export first if you want a copy.

### 14.3 Making a request by email

Write to dimos.is.dev@gmail.com. You will get an answer within **one month**, as the GDPR
requires. There is no charge. If the request is complex, that can be extended by two
further months, and you will be told why within the first month. You may be asked to
confirm you are the account holder — not to obstruct you, but because handing account data
to the wrong person would be a breach in itself.

## 15. What you put into PMD is up to you

PMD asks you for very little: an **email address** and a **name**. A **bio** and a **photo**
are optional, and nothing else about you is requested.

The bio is a free-text box. Whatever you type into it is stored exactly as you typed it,
and is visible to the other members of your workspaces. The same goes for anything you type
into project descriptions, tasks and comments.

**Please do not put sensitive personal information into free-text fields** — yours or
anyone else's. Not phone numbers, home addresses, health information, ID numbers, or
anything you would not want a workspace colleague to read.

To be straight with you about what that means: if you *do* type a phone number into your
bio, PMD does not magically not-have it. It goes into the database like any other text, it
is processed like any other text, and it is covered by this policy like any other personal
data. PMD does not filter it out and does not scan for it. The reason to keep it out is
simply that nothing here needs it, and data that was never collected cannot leak.

You stay in control: you can edit or clear any of these fields at any time in Settings, and
you can delete your account entirely (section 14).

## 16. Complaints

If you think PMD is mishandling your data, please email first — it is one developer, and
most things can be fixed quickly.

You also have the right to complain to a supervisory authority. In Greece that is:

**Hellenic Data Protection Authority**
Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα
Kifissias 1-3, 115 23 Athens, Greece
<https://www.dpa.gr>

You can also complain to the supervisory authority in your own EU country of residence or
place of work.

## 17. Age limit

PMD is not intended for children. **You must be at least 16 years old to create an
account.** PMD does not knowingly collect data from anyone under 16. If you believe a child
has an account, email the address in section 2 and it will be deleted.

PMD is a workplace-style project management tool. It is not marketed to, designed for, or
of any obvious interest to children.

[TO BE CONFIRMED: the age threshold is still an open decision, and the correct floor under
Greek law should be checked — see `README.md`.]

## 18. Security

An honest description rather than a list of badges.

What is actually done:

- Passwords are stored as BCrypt hashes, never in plain text.
- Session tokens are stored hashed, not in their usable form.
- The refresh cookie is `HttpOnly` and `Secure`; the access token stays in memory.
- CSRF is enforced with a double-submit token.
- Every workspace endpoint checks membership before returning data (section 9).
- The database requires authentication and sits on an internal Docker network with no
  internet route.
- The Pi has no inbound ports open; everything arrives through an outbound-only encrypted
  Cloudflare Tunnel.
- Sign-in attempts are rate-limited per IP and per account, with temporary lockouts.
- Uploads are checked by their actual file bytes, not by their filename, and are rewritten
  with a server-controlled name and extension.
- IP addresses and user-agents are reduced before storage, as described in section 5.

What is not claimed:

- PMD has **no security certification** — no ISO 27001, no SOC 2, nothing. It has not been
  independently certified or penetration-tested by an outside firm.
- It runs on **one Raspberry Pi**, maintained in his spare time by **one person**, with no
  24/7 monitoring and no on-call rotation.
- No system is perfectly secure, and PMD is a small one. Section 8 describes a known
  weakness in how avatar files are handled, in full, rather than hiding it.

If there is ever a personal data breach that is likely to result in a high risk to your
rights and freedoms, you will be told without undue delay, and the Hellenic DPA will be
notified within 72 hours as Article 33 requires.

If you find a vulnerability, please report it — see [`SECURITY.md`](../../SECURITY.md) in
the repository.

## 19. Changes to this policy

If this policy changes, the "Last updated" date at the top changes with it.

PMD is going to stay what it is: a project management tool. Changes to this policy will be
about **operating that tool** — a new provider, a clearer explanation, a corrected
retention period. PMD is not going to quietly start collecting a different kind of data
about you, and if the purposes ever did need to widen, that is exactly the kind of change
that gets notified in advance rather than slipped in.

For minor changes (wording, clarifications), updating the page is the whole notice.

For **material** changes — a new recipient, a new purpose, a new legal basis, a longer
retention period, or anything that meaningfully changes what happens to your data — you
will be notified **in the app, and by email if a mail server is configured by then, before
the change takes effect**, so you have a real chance to read it and, if you object, to
export your data and close your account.

Previous versions are in the repository's git history, which is public, so you can see
exactly what changed and when.

## 20. Contact

**Email:** dimos.is.dev@gmail.com

For: data requests, questions about this policy, complaints, or anything else about your
data in PMD.
