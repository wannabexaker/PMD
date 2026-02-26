package com.pmd.config;

import java.util.HashMap;
import java.util.Map;
import java.time.Instant;
import jakarta.servlet.http.HttpServletRequest;
import com.pmd.security.RequestIdFilter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatusException(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return ResponseEntity.status(status).body(errorBody(
            status,
            normalizeMessage(ex.getReason(), status),
            request.getRequestURI(),
            resolveRequestId(request),
            null
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> {
            if (error.getField() != null && error.getDefaultMessage() != null) {
                fieldErrors.put(error.getField(), error.getDefaultMessage());
            }
        });
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .filter(value -> value != null && !value.isBlank())
            .findFirst()
            .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody(
            HttpStatus.BAD_REQUEST,
            message,
            request.getRequestURI(),
            resolveRequestId(request),
            fieldErrors
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex, HttpServletRequest request) {
        logger.error("Unhandled API exception on {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Unexpected server error",
            request.getRequestURI(),
            resolveRequestId(request),
            null
        ));
    }

    private Map<String, Object> errorBody(HttpStatus status,
                                          String message,
                                          String path,
                                          String requestId,
                                          Map<String, String> fieldErrors) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("code", statusToCode(status));
        body.put("message", message);
        if (path != null && !path.isBlank()) {
            body.put("path", path);
        }
        if (requestId != null && !requestId.isBlank()) {
            body.put("requestId", requestId);
        }
        if (fieldErrors != null && !fieldErrors.isEmpty()) {
            body.put("fieldErrors", fieldErrors);
        }
        return body;
    }

    private String resolveRequestId(HttpServletRequest request) {
        Object attr = request.getAttribute(RequestIdFilter.ATTR);
        if (attr instanceof String value && !value.isBlank()) {
            return value;
        }
        String header = request.getHeader(RequestIdFilter.HEADER);
        return header == null || header.isBlank() ? null : header.trim();
    }

    private String normalizeMessage(String reason, HttpStatus status) {
        if (reason != null && !reason.isBlank()) {
            return reason;
        }
        return switch (status) {
            case BAD_REQUEST -> "Validation failed";
            case UNAUTHORIZED -> "Authentication required";
            case FORBIDDEN -> "Not allowed";
            case NOT_FOUND -> "Resource not found";
            case CONFLICT -> "Conflict";
            case TOO_MANY_REQUESTS -> "Rate limit exceeded";
            default -> "Request failed";
        };
    }

    private String statusToCode(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> "VALIDATION_FAILED";
            case UNAUTHORIZED -> "UNAUTHORIZED";
            case FORBIDDEN -> "FORBIDDEN";
            case NOT_FOUND -> "NOT_FOUND";
            case CONFLICT -> "CONFLICT";
            case TOO_MANY_REQUESTS -> "RATE_LIMITED";
            case INTERNAL_SERVER_ERROR -> "INTERNAL_ERROR";
            default -> "REQUEST_FAILED";
        };
    }
}
