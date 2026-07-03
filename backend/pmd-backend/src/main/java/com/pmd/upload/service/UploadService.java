package com.pmd.upload.service;

import com.pmd.upload.dto.UploadResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UploadService {

    private static final long MAX_SIZE_BYTES = 2 * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp"
    );
    // Canonical, server-controlled extension per allowed content type. The stored
    // filename never derives from the client-supplied name, so a disguised
    // ".svg"/".html" upload can never be written or served.
    private static final Map<String, String> CONTENT_TYPE_TO_EXTENSION = Map.of(
        "image/jpeg", "jpg",
        "image/png", "png",
        "image/webp", "webp"
    );

    private final Path uploadRoot;

    public UploadService() {
        this.uploadRoot = Path.of("uploads");
    }

    public UploadResponse store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "File exceeds 2MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read file");
        }

        // Verify the ACTUAL bytes (magic numbers) rather than trusting the
        // client-supplied Content-Type or filename. This blocks disguised
        // SVG/HTML uploads that would otherwise be served from /uploads and
        // execute script in the victim's browser (stored XSS).
        String detected = detectImageExtension(bytes);
        String expected = CONTENT_TYPE_TO_EXTENSION.get(contentType);
        if (detected == null || !detected.equals(expected)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File content does not match an allowed image type");
        }

        String id = UUID.randomUUID().toString();
        String storedName = id + "." + detected;
        Path target = uploadRoot.resolve(storedName);

        try {
            Files.createDirectories(uploadRoot);
            Files.write(target, bytes);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        String url = "/uploads/" + storedName;
        String originalName = file.getOriginalFilename();
        return new UploadResponse(id, url, contentType, originalName != null ? originalName : storedName, (long) bytes.length);
    }

    /**
     * Returns the canonical extension ("jpg"/"png"/"webp") when the byte header
     * matches that image format's magic number, or {@code null} otherwise.
     */
    static String detectImageExtension(byte[] b) {
        if (b == null) {
            return null;
        }
        // JPEG: FF D8 FF
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
            && (b[4] & 0xFF) == 0x0D && (b[5] & 0xFF) == 0x0A && (b[6] & 0xFF) == 0x1A && (b[7] & 0xFF) == 0x0A) {
            return "png";
        }
        // WEBP: "RIFF" <4 bytes size> "WEBP"
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "webp";
        }
        return null;
    }
}
