package com.pmd.upload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
class OrphanUploadSweepServiceTest {

    // Smallest valid PNG header: enough for the magic-byte check.
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0};

    @Autowired
    private MongoTemplate mongo;

    @TempDir
    Path dir;

    private Path storedFile(Instant modified) throws Exception {
        Path file = dir.resolve(UUID.randomUUID() + ".png");
        Files.write(file, PNG);
        Files.setLastModifiedTime(file, FileTime.from(modified));
        return file;
    }

    @Test
    void deletesOldUnreferencedFilesAndKeepsReferencedOrRecentOnes() throws Exception {
        UploadService uploads = new UploadService(dir, 0);
        OrphanUploadSweepService sweep = new OrphanUploadSweepService(mongo, uploads);
        Instant now = Instant.now();

        Path orphan = storedFile(now.minus(2, ChronoUnit.DAYS));
        Path recent = storedFile(now.minus(1, ChronoUnit.HOURS));
        Path referenced = storedFile(now.minus(2, ChronoUnit.DAYS));
        Path notOurs = dir.resolve("README.txt");
        Files.writeString(notOurs, "not an upload");
        Files.setLastModifiedTime(notOurs, FileTime.from(now.minus(30, ChronoUnit.DAYS)));

        Document user = new Document("email", "sweep-" + System.nanoTime() + "@example.com")
            .append("avatarUrl", "/uploads/" + referenced.getFileName());
        mongo.insert(user, "users");
        try {
            int deleted = sweep.sweep(now);

            assertThat(deleted).isEqualTo(1);
            assertThat(orphan).doesNotExist();
            assertThat(recent).exists();
            assertThat(referenced).exists();
            assertThat(notOurs).exists();
        } finally {
            mongo.remove(user, "users");
        }
    }

    @Test
    void refusesAnUploadThatWouldExceedTheTotalCap() throws Exception {
        UploadService uploads = new UploadService(dir, 1); // 1 MB
        Files.write(dir.resolve(UUID.randomUUID() + ".png"), new byte[1024 * 1024 - 4]);

        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", PNG);

        assertThatThrownBy(() -> uploads.store(file))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.INSUFFICIENT_STORAGE));
    }
}
