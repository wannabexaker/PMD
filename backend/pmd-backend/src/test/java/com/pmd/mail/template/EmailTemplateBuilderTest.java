package com.pmd.mail.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link EmailTemplateBuilder}. Guards the config-driven base URL
 * (no hardcoded localhost in production emails) and HTML escaping of user content.
 */
class EmailTemplateBuilderTest {

    private WelcomeEmailModel welcome(String email, String token) {
        return new WelcomeEmailModel("Alex", email, "Web", Instant.parse("2026-01-01T00:00:00Z"), token);
    }

    @Test
    void welcomeEmailUsesConfiguredBaseUrl() {
        EmailTemplateBuilder builder = new EmailTemplateBuilder("https://pmd.example.com");
        EmailContent content = builder.buildWelcomeEmail(welcome("user@example.com", "tok123"));

        assertThat(content.getHtmlBody()).contains("https://pmd.example.com/confirm-email?token=tok123");
        assertThat(content.getTextBody()).contains("https://pmd.example.com/confirm-email?token=tok123");
        assertThat(content.getHtmlBody()).doesNotContain("localhost");
    }

    @Test
    void normalizesTrailingSlashInBaseUrl() {
        EmailTemplateBuilder builder = new EmailTemplateBuilder("https://pmd.example.com/");
        EmailContent content = builder.buildWelcomeEmail(welcome("user@example.com", "t"));

        assertThat(content.getHtmlBody()).contains("https://pmd.example.com/confirm-email?token=t");
        assertThat(content.getHtmlBody()).doesNotContain("example.com//confirm");
    }

    @Test
    void blankBaseUrlFallsBackToLocalhostDefault() {
        EmailTemplateBuilder builder = new EmailTemplateBuilder("   ");
        EmailContent content = builder.buildWelcomeEmail(welcome("user@example.com", "t"));

        assertThat(content.getHtmlBody()).contains("http://localhost:5173/confirm-email");
    }

    @Test
    void escapesUserSuppliedContentInHtmlBody() {
        EmailTemplateBuilder builder = new EmailTemplateBuilder("https://pmd.example.com");
        EmailContent content = builder.buildWelcomeEmail(welcome("a<script>alert(1)</script>@x.com", "t"));

        assertThat(content.getHtmlBody()).contains("&lt;script&gt;");
        assertThat(content.getHtmlBody()).doesNotContain("<script>alert(1)</script>");
    }
}
