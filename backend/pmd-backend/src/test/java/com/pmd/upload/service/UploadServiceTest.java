package com.pmd.upload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pmd.upload.dto.UploadResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Unit tests for {@link UploadService}. No Spring context / Mongo required.
 * Guards the stored-XSS fix: uploads must be validated by their real bytes,
 * not by the client-supplied Content-Type or filename.
 */
class UploadServiceTest {

    private final UploadService service = new UploadService();

    private static final byte[] PNG = new byte[] {
        (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0
    };
    private static final byte[] JPEG = new byte[] {
        (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0
    };
    private static final byte[] WEBP = new byte[] {
        'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'
    };

    @Test
    void deleteByUrlRemovesAFileItMinted() throws Exception {
        UploadResponse stored = service.store(new MockMultipartFile("file", "a.png", "image/png", PNG));
        Path onDisk = Path.of("uploads", stored.getUrl().substring("/uploads/".length()));
        assertThat(onDisk).exists();

        assertThat(service.deleteByUrl(stored.getUrl())).isTrue();
        assertThat(onDisk).doesNotExist();
        // Erasure runs once; a second pass must not report a phantom deletion.
        assertThat(service.deleteByUrl(stored.getUrl())).isFalse();
    }

    /**
     * avatarUrl is client-supplied, so deleteByUrl is reachable with an attacker-chosen
     * string. Anything other than the exact shape store() mints must be ignored — never
     * resolved as a path.
     */
    @Test
    void deleteByUrlRefusesAnythingItDidNotMint() throws Exception {
        Path bystander = Path.of("uploads", "not-ours.png");
        Files.createDirectories(bystander.getParent());
        Files.write(bystander, PNG);
        try {
            assertThat(service.deleteByUrl("/uploads/../../etc/passwd")).isFalse();
            assertThat(service.deleteByUrl("/uploads/..%2Fnot-ours.png")).isFalse();
            assertThat(service.deleteByUrl("/uploads/not-ours.png")).isFalse();
            assertThat(service.deleteByUrl("/etc/passwd")).isFalse();
            assertThat(service.deleteByUrl("https://evil.example/uploads/x.png")).isFalse();
            // A real UUID name, but pointing outside the upload root.
            assertThat(service.deleteByUrl("/uploads/../uploads/" + java.util.UUID.randomUUID() + ".png")).isFalse();
            assertThat(service.deleteByUrl("")).isFalse();
            assertThat(service.deleteByUrl(null)).isFalse();
            // The bystander must still be there: none of the above touched the disk.
            assertThat(bystander).exists();
        } finally {
            Files.deleteIfExists(bystander);
        }
    }

    @Test
    void detectsRealImageFormatsFromMagicBytes() {
        assertThat(UploadService.detectImageExtension(PNG)).isEqualTo("png");
        assertThat(UploadService.detectImageExtension(JPEG)).isEqualTo("jpg");
        assertThat(UploadService.detectImageExtension(WEBP)).isEqualTo("webp");
        assertThat(UploadService.detectImageExtension("<svg/>".getBytes())).isNull();
        assertThat(UploadService.detectImageExtension(new byte[] {1, 2})).isNull();
    }

    @Test
    void rejectsSvgDisguisedAsPng() {
        byte[] svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "evil.svg", "image/png", svg);
        assertThatThrownBy(() -> service.store(file))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("does not match");
    }

    @Test
    void rejectsWhenDeclaredTypeMismatchesActualBytes() {
        // Real PNG bytes but declared as JPEG -> reject (declared type must match content).
        MockMultipartFile file = new MockMultipartFile("file", "a.jpg", "image/jpeg", PNG);
        assertThatThrownBy(() -> service.store(file)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsUnsupportedContentType() {
        MockMultipartFile file = new MockMultipartFile("file", "a.gif", "image/gif", new byte[] {1, 2, 3});
        assertThatThrownBy(() -> service.store(file)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsEmptyFile() {
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", new byte[0]);
        assertThatThrownBy(() -> service.store(file)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void storesValidPngUnderServerControlledCanonicalName() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "PhOtO.PNG", "image/png", PNG);
        UploadResponse res = service.store(file);
        try {
            assertThat(res.getUrl()).startsWith("/uploads/");
            assertThat(res.getUrl()).endsWith(".png");
            // Filename is a UUID, never the attacker-supplied "PhOtO.PNG".
            assertThat(res.getUrl()).doesNotContain("PhOtO");
        } finally {
            String name = res.getUrl().substring("/uploads/".length());
            Files.deleteIfExists(Path.of("uploads", name));
        }
    }
}
