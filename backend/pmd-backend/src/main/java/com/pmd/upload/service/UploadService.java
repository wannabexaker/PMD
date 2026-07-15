package com.pmd.upload.service;

import com.pmd.upload.dto.UploadResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
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

    static final String UPLOAD_URL_PREFIX = "/uploads/";
    // Matches exactly what store() mints: a random UUID plus a server-chosen extension.
    private static final Pattern STORED_URL_PATTERN = Pattern.compile(
        "^/uploads/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.(jpg|png|webp)$"
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

        String url = UPLOAD_URL_PREFIX + storedName;
        String originalName = file.getOriginalFilename();
        return new UploadResponse(id, url, contentType, originalName != null ? originalName : storedName, (long) bytes.length);
    }

    /**
     * Deletes a stored upload given the URL we minted for it.
     *
     * <p>Callers pass a URL that originated in a client-supplied field (avatarUrl is
     * part of the update-profile payload), so this must never be treated as a path.
     * Only the exact shape {@code store} produces is accepted — a UUID plus a
     * server-chosen extension. Nothing else is touched, which makes traversal
     * impossible by construction: a UUID cannot contain a separator or a dot.
     *
     * @return true when a file was actually removed.
     */
    public boolean deleteByUrl(String url) {
        if (url == null || !STORED_URL_PATTERN.matcher(url).matches()) {
            return false;
        }
        Path target = uploadRoot.resolve(url.substring(UPLOAD_URL_PREFIX.length())).normalize();
        // Belt and braces: the pattern already guarantees containment.
        if (!target.startsWith(uploadRoot.normalize())) {
            return false;
        }
        try {
            return Files.deleteIfExists(target);
        } catch (IOException ex) {
            // Erasure of the database record must not be blocked by a stuck file.
            return false;
        }
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
