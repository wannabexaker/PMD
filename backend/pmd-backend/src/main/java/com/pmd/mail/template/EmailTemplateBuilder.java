package com.pmd.mail.template;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class EmailTemplateBuilder {

    private static final String APP_NAME = "PMD";
    private static final String APP_URL = "http://localhost:5173/dashboard";
    private static final String FOOTER = "(c) 2026 PMD. All rights reserved.";
    private static final String DISMISS = "If you did not request this, you can ignore this email.";
    private static final String AUTO = "This is an automated message from PMD.";

    public EmailContent buildAssignmentEmail(AssignmentEmailModel model) {
        String title = "You were assigned to a project";
        String assignedAt = formatInstant(model.getAssignedAt());
        String status = safe(model.getProjectStatus());
        String description = trimSnippet(model.getProjectDescription(), 200);
        String html = wrapHtml(title, """
            <p>Hi %s,</p>
            <p>You have been assigned to a project.</p>
            %s
            <a class="cta" href="%s">Open PMD</a>
            """.formatted(
            escape(model.getAssignedToName()),
            summaryBlock(
                row("Project", model.getProjectName()),
                row("Status", status),
                row("Assigned by", formatNameEmail(model.getAssignedByName(), model.getAssignedByEmail())),
                row("Assigned to", formatNameEmail(model.getAssignedToName(), model.getAssignedToEmail())),
                row("Description", description),
                row("Date", assignedAt)
            ),
            APP_URL
        ));

        String text = """
            You were assigned to a project

            Project: %s
            Status: %s
            Assigned by: %s
            Assigned to: %s
            Description: %s
            Date: %s

            Open PMD: %s

            %s
            %s
            """.formatted(
            safe(model.getProjectName()),
            status,
            formatNameEmail(model.getAssignedByName(), model.getAssignedByEmail()),
            formatNameEmail(model.getAssignedToName(), model.getAssignedToEmail()),
            description,
            assignedAt,
            APP_URL,
            AUTO,
            DISMISS
        );

        return new EmailContent("Assigned: " + safe(model.getProjectName()), html, text);
    }

    public EmailContent buildWelcomeEmail(WelcomeEmailModel model) {
        String title = "Confirm your PMD account";
        String createdAt = formatInstant(model.getCreatedAt());
        String team = model.getTeam() != null && !model.getTeam().isBlank() ? model.getTeam() : "(pending)";
        String confirmUrl = "http://localhost:5173/confirm-email?token=" + safe(model.getToken());
        String html = wrapHtml(title, """
            <p>Welcome to PMD!</p>
            <p>Please confirm your email to activate your account.</p>
            %s
            <a class=\"cta\" href=\"%s\">Confirm email</a>
            """.formatted(
            summaryBlock(
                row("Email", model.getEmail()),
                row("Team", team),
                row("Created", createdAt)
            ),
            confirmUrl
        ));

        String text = """
            Confirm your PMD account

            Email: %s
            Team: %s
            Created: %s

            Confirm email: %s

            %s
            %s
            """.formatted(
            safe(model.getEmail()),
            team,
            createdAt,
            confirmUrl,
            AUTO,
            DISMISS
        );

        return new EmailContent("Confirm your PMD account", html, text);
    }

    private String wrapHtml(String title, String body) {
        return """
            <html>
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                  body { margin:0; padding:0; font-family: Arial, sans-serif; background:#f5f5f7; color:#111827; }
                  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
                  .header { display:flex; align-items:center; gap:10px; padding:16px 20px; background:#111827; color:#ffffff; }
                  .brand { font-weight:700; letter-spacing:0.12em; font-size:14px; }
                  .content { padding: 20px; }
                  h1 { font-size: 20px; margin: 0 0 12px; }
                  p { margin: 0 0 12px; line-height:1.5; }
                  .summary { border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#f9fafb; margin:16px 0; }
                  .row { display:flex; justify-content:space-between; gap:12px; padding:6px 0; font-size:14px; }
                  .label { color:#6b7280; }
                  .cta { display:inline-block; background:#7c3aed; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:600; }
                  .footer { padding:16px 20px; background:#f9fafb; font-size:12px; color:#6b7280; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    %s
                    <div class="brand">%s</div>
                  </div>
                  <div class="content">
                    <h1>%s</h1>
                    %s
                  </div>
                  <div class="footer">
                    <div>%s</div>
                    <div>%s</div>
                    <div>%s</div>
                  </div>
                </div>
              </body>
            </html>
            """.formatted(svgLogo(), APP_NAME, escape(title), body, FOOTER, AUTO, DISMISS);
    }

    private String summaryBlock(String... rows) {
        return """
            <div class="summary">
              %s
            </div>
            """.formatted(String.join("", rows));
    }

    private String row(String key, String value) {
        return """
            <div class="row">
              <div class="label">%s</div>
              <div>%s</div>
            </div>
            """.formatted(escape(key), escape(value));
    }

    private String formatNameEmail(String name, String email) {
        String safeName = safe(name);
        String safeEmail = safe(email);
        if (!safeName.isBlank() && !safeEmail.isBlank()) {
            return safeName + " (" + safeEmail + ")";
        }
        return !safeEmail.isBlank() ? safeEmail : safeName;
    }

    private String formatInstant(Instant instant) {
        if (instant == null) {
            return "Unknown";
        }
        return DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault()).format(instant);
    }

    private String safe(String value) {
        return Objects.toString(value, "");
    }

    private String trimSnippet(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;");
    }

    private String svgLogo() {
        return """
            <svg width="28" height="28" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="8" width="26" height="10" rx="4" fill="#7c3aed" />
              <rect x="10" y="20" width="26" height="10" rx="4" fill="#a855f7" />
              <rect x="14" y="32" width="26" height="10" rx="4" fill="#c084fc" />
            </svg>
            """;
    }
}





