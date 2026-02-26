package com.pmd.auth.dto;

public class RegisterResponse {

    private boolean accountCreated;
    private boolean verificationEmailSent;
    private String message;

    public RegisterResponse() {
    }

    public RegisterResponse(boolean accountCreated, boolean verificationEmailSent, String message) {
        this.accountCreated = accountCreated;
        this.verificationEmailSent = verificationEmailSent;
        this.message = message;
    }

    public boolean isAccountCreated() {
        return accountCreated;
    }

    public void setAccountCreated(boolean accountCreated) {
        this.accountCreated = accountCreated;
    }

    public boolean isVerificationEmailSent() {
        return verificationEmailSent;
    }

    public void setVerificationEmailSent(boolean verificationEmailSent) {
        this.verificationEmailSent = verificationEmailSent;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
