# Assignment Email Notifications

## When emails are sent
- Emails are sent only when **new users are assigned** to a project.
- Re-saving a project with the same members does **not** send emails.
- Removing users does **not** send emails.

## How it works
- Project updates compute `newlyAssignedUserIds` (new minus old).
- After the project is saved, a `ProjectAssignmentCreated` event is published per new assignee.
- `EmailNotificationService` listens to the event and sends an email if the user has a valid email.
- If SMTP is unavailable, the app **logs a warning** and continues (no crash).

## MailHog in development
- SMTP: `localhost:1025`
- Web UI: `http://localhost:8025`
- From address: `no-reply@pmd.local`

## Switching to a real SMTP provider
- Update `spring.mail.*` settings in `application.yml` (host/port/auth/tls).
- Keep `pmd.mail.from` configured to your desired sender.
