package com.pmd.auth.dto;

public class ConfirmEmailResponse {

    private final ConfirmEmailStatus status;

    public ConfirmEmailResponse(ConfirmEmailStatus status) {
        this.status = status;
    }

    public ConfirmEmailStatus getStatus() {
        return status;
    }
}
