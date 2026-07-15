package com.pmd.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class GoogleLoginRequest {

    /** The Google Identity Services ID token (JWT) returned to the browser. */
    @NotBlank
    private String credential;

    /** Optional Cloudflare Turnstile token (verified when Turnstile is enabled). */
    private String turnstileToken;

    private Boolean remember;

    /**
     * Acceptance of the terms and privacy notice. Only consulted when this sign-in would
     * create a new account — an existing user signing in is not re-asked.
     */
    private Boolean acceptedTerms;

    public GoogleLoginRequest() {
    }

    public String getCredential() {
        return credential;
    }

    public void setCredential(String credential) {
        this.credential = credential;
    }

    public String getTurnstileToken() {
        return turnstileToken;
    }

    public void setTurnstileToken(String turnstileToken) {
        this.turnstileToken = turnstileToken;
    }

    public boolean isRemember() {
        return Boolean.TRUE.equals(remember);
    }

    public void setRemember(Boolean remember) {
        this.remember = remember;
    }

    public boolean isAcceptedTerms() {
        return Boolean.TRUE.equals(acceptedTerms);
    }

    public void setAcceptedTerms(Boolean acceptedTerms) {
        this.acceptedTerms = acceptedTerms;
    }
}
