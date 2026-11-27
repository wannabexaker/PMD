package com.pmd.auth.dto;

public class RegisterResponse {

    private boolean accountCreated;
    private boolean verificationEmailSent;
    private String message;
    // False when the server lets unverified accounts sign in, so the client can say
    // "you can sign in now" instead of "check your inbox".
    private boolean emailVerificationRequired = true;

    public RegisterResponse() {
    }

    public RegisterResponse(boolean accountCreated, boolean verificationEmailSent, String message) {
        this.accountCreated = accountCreated;
        this.verificationEmailSent = verificationEmailSent;
        this.message = message;
    }

    public RegisterResponse(boolean accountCreated, boolean verificationEmailSent, String message,
                            boolean emailVerificationRequired) {
        this(accountCreated, verificationEmailSent, message);
        this.emailVerificationRequired = emailVerificationRequired;
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

    public boolean isEmailVerificationRequired() {
        return emailVerificationRequired;
    }

    public void setEmailVerificationRequired(boolean emailVerificationRequired) {
        this.emailVerificationRequired = emailVerificationRequired;
    }
}
