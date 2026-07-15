# PMD — Terms of Use

> **Draft. Not legal advice.**
> This document was written by PMD's developer, who is not a lawyer. It is an honest
> attempt to set out the terms on which PMD is offered. It has not been reviewed by a
> qualified lawyer. It should be reviewed by one before it is published or relied on. The
> open questions are listed in [`README.md`](./README.md) in this folder.

**Last updated:** 15 July 2026
**Status:** Draft — not yet in force.
**Applies to:** the PMD web application at <https://pmd.olamov.com>.

---

## 1. Acceptance

These terms are an agreement between you and the operator of PMD (identified in section 2).

When you register, you tick a box confirming that you accept these terms and have read the
Privacy Policy. **By ticking that box and creating an account, you accept these terms.** An
account cannot be created without it. If you do not accept them, please do not use PMD.

Please also read the [Privacy Policy](./privacy-policy.md). It explains what happens to
your data and forms part of your relationship with PMD.

That checkbox is your acceptance of *these terms*. It is not a consent to data processing —
the Privacy Policy explains, in its section 4.9, why the legal basis for running your
account is this contract rather than consent, and what that means for you.

## 2. Who you are dealing with

PMD is operated by:

- **Name:** Ioannis Dimos (Ιωάννης Δήμος), acting as an individual
- **Country:** Greece (EU)
- **Email:** dimos.is.dev@gmail.com

PMD is run by one independent developer, in his own name. There is no company behind it, no
support team, and no service desk. When you email, you are emailing a person, who replies
when he can.

## 3. What PMD is

PMD ("Project Management Dashboard") is a web application for managing projects and tasks
in shared workspaces. You can create a workspace, invite people, create projects and
tasks, assign them, comment, and mention colleagues.

PMD is currently provided **free of charge**. There is no paid plan and no billing. If
that ever changes, you will be told in advance and you will not be charged for anything
without agreeing to it first.

### 3.1 This is a beta

PMD is in a **soft launch**. It is early software with few users. Features will change,
break, and occasionally disappear. Read section 4 before you put anything important into it.

## 4. Availability, reliability, and your data — read this part

This is the section most services write vaguely. Here it is plainly.

**PMD runs on a Raspberry Pi 4 in the developer's home in Greece.** Not a data centre. A
small computer in a flat, on a domestic internet connection, on domestic mains power.

That has a real and specific consequence:

- **There is no uptime guarantee. None.** No SLA, no target percentage, no credits.
- A power cut, a router reboot, an internet outage, a failed SD card, a bad deployment, a
  holiday, or the developer simply being asleep can all take PMD offline, possibly for a
  long time.
- Maintenance and restarts happen when they happen, and are usually not announced in
  advance.
- **Data loss is genuinely possible.** Hardware fails. Consumer hardware fails more.

**So: do not use PMD as the only copy of anything you care about.** Keep your own copy of
anything important. Export your data regularly (Settings has an export). If PMD is the only
place something exists, you are one SD card failure away from losing it, and this document
is telling you that in advance rather than after.

The developer will make reasonable efforts to keep PMD running and to avoid losing data,
but makes **no promise** of either.

## 5. Eligibility and age

You must be **at least 16 years old** to use PMD. By creating an account you confirm that
you are.

You must also have the legal capacity to enter into this agreement, and you must not be
barred from using the service under any applicable law.

## 6. Your account

You are responsible for your account.

- **Give accurate information.** Your email address must be real and yours. Do not
  impersonate anyone.
- **Keep your password safe.** Use a strong, unique password. Do not reuse it from another
  site. Do not share it. If you use "Sign in with Google", keep your Google account
  secure — anyone with it has your PMD account.
- **You are responsible for what happens under your account**, unless someone got in
  through a failure that is genuinely PMD's fault and not yours.
- **Tell the developer if something is wrong.** If you think your account has been
  accessed by someone else, email dimos.is.dev@gmail.com. You can also review and revoke
  your active sessions in Settings.
- **One account per person.** Do not create accounts in bulk or automatically.

## 7. Acceptable use

Do not use PMD to:

- **Break the law**, or store, share or transmit anything illegal.
- **Infringe anyone's rights.** Do not upload content — including images and avatars —
  that you do not have the right to use. Do not upload someone else's copyrighted work, or
  a photo of someone who has not agreed to it.
- **Harass, threaten, defame or abuse** anyone, including through comments and mentions.
- **Attack the service.** No attempts to break in, escalate privileges, bypass
  authentication, exhaust resources, disrupt other users, or interfere with the Cloudflare
  Tunnel or the anti-bot protection. Do not evade rate limits.
- **Scrape it.** No automated crawling, harvesting, or bulk extraction of data from PMD,
  and no bots or scripts against the API beyond ordinary use of the app. The API exists to
  serve the app, not to be mined.
- **Upload malware**, or anything designed to damage a system or a person.
- **Abuse other people's data.** Do not put personal data about other people into PMD
  unless you are entitled to. If you invite colleagues into a workspace and manage their
  information there, that is on you as much as on PMD.
- **Resell or sublicense** access to PMD.
- **Misrepresent PMD**, or use its name or branding to suggest an endorsement that does not
  exist.

### 7.1 Security research

Good-faith security research is welcome, but do it responsibly: test only your own
account, do not access other people's data, do not degrade the service for others, and
report what you find privately. See [`SECURITY.md`](../../SECURITY.md) in the repository.
Do not publish a vulnerability before it has been fixed.

## 8. Your content

**You keep ownership of your content.** Everything you create in PMD — your projects,
tasks, comments, bio, avatar — stays yours. PMD does not claim ownership of any of it.

To be able to run the service, PMD needs your permission to handle your content. So you
grant a **non-exclusive, worldwide, royalty-free licence to host, store, copy, transmit
and display your content, solely to operate and provide PMD to you and to the people you
have shared it with**, and to make backups.

That is the whole licence. It exists because a server cannot store and display your data
without permission to store and display your data. It does not permit anything else — PMD
will not sell your content, publish it, use it for advertising, use it to train machine
learning models, or show it to anyone you have not shared it with.

The licence ends when you delete the content or your account, except for:

- backup copies, until they age out in the ordinary backup cycle; and
- content you put into other people's workspaces, which is covered in section 11.2.

**You are responsible for your content** — for having the right to post it, and for it not
being illegal or infringing.

### 8.1 Avatar images are publicly reachable, and they outlive your account

Repeating this here because it belongs in both documents: **avatar images are served
without authentication.** Anyone with the URL can open one, without signing into PMD. The
URL contains a random UUID and cannot realistically be guessed, but the protection is the
secrecy of the URL rather than a permission check.

**The image file is also not deleted when you delete your account**, and not when you
replace it with a different avatar. It stays on the disk at the same public URL.

So: do not upload an avatar you would not be comfortable with a stranger seeing, or one you
might later want recalled. If you want an image file actually removed, email
dimos.is.dev@gmail.com and it will be deleted by hand. Section 8 of the
[Privacy Policy](./privacy-policy.md) explains this in full.

## 9. Workspaces and other users

PMD is a shared tool. What you put in a workspace is visible to that workspace's members —
and to nobody else. Workspaces are separated from each other, people who are not members
cannot reach yours, and other users cannot browse your details unless they share a
workspace with you. Section 9 of the [Privacy Policy](./privacy-policy.md) sets this out in
full, including the one exception: a platform administrator (the operator) can enter any
workspace in order to run the service.

- The **workspace owner and administrators** can see that workspace's content, manage its
  members and roles, and see an audit log of administrative actions. Their powers stop at
  the edge of their own workspace.
- Content you create in someone else's workspace is visible to them, and they may keep it —
  see section 11.2.
- Deleting a workspace purges its data after a **30-minute grace period**, so an accidental
  deletion can be cancelled. After that it is gone.

Disputes between members of a workspace are for those members to sort out. PMD provides
the tool; it does not adjudicate who was right.

## 10. No warranties

**PMD is provided "as is" and "as available", with no warranties of any kind**, to the
fullest extent permitted by law.

There is no warranty that PMD will be available, uninterrupted, secure, error-free, fit for
any particular purpose, or that it will not lose data. There is no warranty that defects
will be fixed. Any implied warranties are disclaimed to the extent the law allows them to
be.

**But note:** if you are a consumer in the EU, you have rights that cannot be signed away
by a sentence in a document like this. Nothing here removes them. See section 12.

## 11. Suspension, termination, and deletion

### 11.1 Your right to leave

**You can delete your account at any time**, from the "Your data" section of your profile
page. No reason, no notice, no retention attempt. The same place lets you **export
everything PMD holds about you** as a JSON file — do that first if you want a copy, because
deletion cannot be undone.

Deleting your account removes your account record, your sessions, your preferences, your
workspace memberships, your join requests and your sign-in security events.

**Deletion is blocked in one case:** if you are the only person who can manage a workspace
that still has other members in it, you will be asked to hand that workspace over or delete
it first. Otherwise those members would be left in a workspace nobody can administer. You
will be told which workspaces are in the way.

### 11.2 What survives your deletion

**Your avatar image file.** It is not deleted — see section 8.1. Email
dimos.is.dev@gmail.com to have it removed by hand.

**Content you authored in other people's workspaces** — comments, projects, task history —
is not deleted with your account. It stays in those workspaces and stops resolving to your
name, showing as **"Deleted user"** instead. The content itself remains, because it belongs
to a shared workspace that other people are still using and removing it would damage their
records. Workspace audit entries recording your administrative actions are also kept for
their retention period, with your name replaced.

If you need that content removed too, email dimos.is.dev@gmail.com and it will be handled
case by case, taking account of your erasure rights and the other members' interests.

### 11.3 Suspension or termination by PMD

Your account may be suspended or terminated if you materially breach these terms —
particularly section 7 — or if it is necessary to protect the service or other users.

Where it is reasonable and lawful to do so, you will get **notice and a chance to explain
or fix the problem first**. Immediate action may be taken without notice where a breach is
serious, causes ongoing harm, or is unlawful.

If your account is terminated, you can ask for a copy of your data, and it will be provided
unless there is a legal reason not to.

### 11.4 Discontinuing the service

PMD is a personal project. It may be shut down. If that is planned, you will get **at least
30 days' notice** by email and in the app, so you can export your data. The developer will
make reasonable efforts to give that notice, but a permanent hardware failure could
obviously end things faster than any notice period. See section 4 — keep your own copy.

## 12. Liability

Read this section carefully. It limits liability, but not to zero — and it is written to be
honest about the difference.

### 12.1 What is not excluded

**Nothing in these terms excludes or limits liability for:**

- **death or personal injury** caused by negligence;
- **fraud or fraudulent misrepresentation**;
- **gross negligence (βαριά αμέλεια) or wilful misconduct (δόλος)**;
- **any liability that cannot lawfully be excluded or limited under Greek or EU law**,
  including the **mandatory rights of consumers**.

If any other part of this section conflicts with the paragraph above, the paragraph above
wins.

This is stated first, and stated plainly, because a clause claiming zero liability for
everything would be unenforceable in the EU and would mislead you about your actual rights.

### 12.2 What is limited

Subject to section 12.1, and to the fullest extent permitted by law:

- PMD is **not liable for indirect, incidental, special or consequential loss**, or for
  loss of profits, revenue, business, goodwill or anticipated savings.
- PMD is **not liable for loss of or damage to data**, given the honest warning in section
  4 that you should not use PMD as your only copy of anything important. This limitation
  does not apply where the loss is caused by gross negligence or wilful misconduct.
- PMD is **not liable for service interruptions**, downtime, or for anything caused by
  events outside the developer's reasonable control — power cuts, internet failures,
  hardware failure, or a third-party provider (Vercel, Cloudflare, Google) going down.
- PMD is **not liable for what other users do**, including what they post in a workspace or
  what they do with data you shared with them.

**Cap on liability.** Subject to section 12.1, total aggregate liability arising out of or
in connection with these terms is limited to **the greater of (a) the amount you have paid
for PMD in the 12 months before the event giving rise to the claim — which, while PMD is
free, is zero — and (b) EUR 100**. [TO BE REVIEWED BY A LAWYER: whether a cap of this shape
and size is enforceable against a consumer under Greek law, and whether a "free service"
cap is appropriate at all — see `README.md`.]

### 12.3 If you are a consumer

If you are using PMD as a consumer — outside your trade, business, craft or profession —
you have statutory rights under EU and Greek consumer law that these terms **do not and
cannot** affect. Where anything in this document conflicts with those rights, those rights
apply and the conflicting part does not.

This includes protections under the EU rules on unfair terms in consumer contracts. A term
in a document you did not negotiate is not enforceable against you just because it is
written down.

## 13. Indemnity

If you use PMD in the course of a business, and your use of PMD or your content causes a
third-party claim against the developer, you agree to cover the reasonable costs of dealing
with it — provided you are told about the claim promptly and given the chance to be
involved in how it is handled.

This does not apply to consumers.

## 14. Changes to these terms

These terms may change — because the service changes, or because something here turns out
to be wrong.

There is a limit on what those changes can be about. **PMD is a project management tool and
it is going to stay one.** Changes will be for the operation of PMD — a new provider, a
corrected clause, a feature that needs describing. The purposes stay limited to running the
service you signed up for. PMD is not going to quietly turn into something that wants
different data from you or does different things with it.

If these terms change, the "Last updated" date at the top changes with it.

For **material** changes, you will be notified **in the app, and by email if a mail server
is configured by then, before the change takes effect**. If you do not accept the new
terms, your remedy is to stop using PMD and delete your account, and you can export your
data first.

Continuing to use PMD after a change takes effect means you accept the new terms. You will
not be treated as having accepted a material change you were never shown.

Previous versions are in the repository's public git history.

## 15. Governing law and disputes

These terms are governed by the **laws of Greece**, and the courts of Greece have
jurisdiction. [TO BE COMPLETED: the specific court/city — see `README.md`.]

**If you are a consumer**, this does not deprive you of the protection of the mandatory
provisions of the law of the country where you habitually reside. You may also bring
proceedings in the courts of your own country of residence, and mandatory consumer
protections there continue to apply regardless of what this section says.

**Online dispute resolution.** EU consumers may be able to use the European Commission's
online dispute resolution platform. [TO BE CONFIRMED BY A LAWYER: whether an ODR link is
still required, given that the EU ODR platform ceased operations in July 2025, and what
the current obligation is — see `README.md`.]

## 16. General

- **Severability.** If a provision here is held unenforceable, the rest stays in force, and
  the unenforceable provision is applied to the maximum extent that is enforceable.
- **No waiver.** Not enforcing a term on one occasion does not waive the right to enforce
  it later.
- **Assignment.** You may not transfer your rights under these terms. The developer may
  transfer them to a successor operating PMD, but only if your rights under these terms and
  the Privacy Policy are preserved — and you would be told first.
- **Entire agreement.** These terms and the Privacy Policy are the whole agreement about
  PMD, and replace anything said informally beforehand. This does not limit liability for
  fraudulent misrepresentation.
- **Open source.** PMD's source code is published in a public repository under its own
  licence — see [`LICENSE`](../../LICENSE). That licence governs the *code*. These terms
  govern the *hosted service* at pmd.olamov.com. They are separate.

## 17. Contact

**Email:** dimos.is.dev@gmail.com

For questions about these terms, complaints, account problems, or content concerns.
