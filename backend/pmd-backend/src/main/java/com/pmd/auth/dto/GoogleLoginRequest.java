package com.pmd.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class GoogleLoginRequest {

    /** The Google Identity Services ID token (JWT) returned to the browser. */
    @NotBlank
    private String credential;

    /** Optional Cloudflare Turnstile token (verified when Turnstile is enabled). */
    private String turnstileToken;

    private Boolean remember;

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
}
