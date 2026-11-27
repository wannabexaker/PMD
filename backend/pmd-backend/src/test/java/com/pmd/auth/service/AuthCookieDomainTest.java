package com.pmd.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.pmd.config.AuthSessionProperties;
import org.junit.jupiter.api.Test;

/**
 * When the SPA calls the API on a sibling host, only the script-readable CSRF cookie moves to
 * the shared parent domain. The refresh-token cookie must stay HttpOnly and host-only.
 */
class AuthCookieDomainTest {

    private AuthSessionService service(String csrfDomain) {
        AuthSessionProperties properties = new AuthSessionProperties();
        properties.setSecureCookie(true);
        properties.setCsrfCookieDomain(csrfDomain);
        return new AuthSessionService(null, properties, null);
    }

    @Test
    void csrfCookieUsesTheConfiguredDomainAndIsClearedOnTheSameOne() {
        AuthSessionService service = service("olamov.com");

        String set = service.buildCsrfCookie("token", true);
        String clear = service.buildClearCsrfCookie(true);

        assertThat(set).contains("PMD_CSRF=token").contains("Domain=olamov.com").doesNotContain("HttpOnly");
        assertThat(clear).contains("Domain=olamov.com").contains("Max-Age=0");
    }

    @Test
    void csrfCookieIsHostOnlyByDefault() {
        assertThat(service("").buildCsrfCookie("token", true)).doesNotContain("Domain=");
    }

    @Test
    void refreshCookieNeverGetsTheSharedDomain() {
        AuthSessionService service = service("olamov.com");

        String refresh = service.buildRefreshCookie(new AuthSessionService.IssuedSession("raw", null, false), true);

        assertThat(refresh).contains("HttpOnly").doesNotContain("Domain=");
    }
}
