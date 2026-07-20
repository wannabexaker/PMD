# syntax=docker/dockerfile:1

# Build stage pinned to the native builder arch (BUILDPLATFORM) so the Maven
# build runs natively instead of under slow arm64 emulation. The produced JAR is
# architecture-independent, so it runs unchanged on every target platform.
FROM --platform=$BUILDPLATFORM eclipse-temurin:25-jdk AS build

WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw

COPY src ./src
# Skip both test execution and test compilation in container builds.
RUN ./mvnw -q -Dmaven.test.skip=true package

# Runtime stage is materialised per target platform (linux/amd64, linux/arm64)
# by buildx, so the RPi4 (aarch64) can pull a matching image.
FROM eclipse-temurin:25-jre

WORKDIR /app
# curl for the container healthcheck; a dedicated non-root user for the
# internet-exposed service (least privilege).
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pmd && useradd -r -g pmd -u 1001 pmd \
    && mkdir -p /app/uploads && chown -R pmd:pmd /app
COPY --from=build --chown=pmd:pmd /app/target/*.jar /app/app.jar

USER pmd
EXPOSE 8080
# exec so the JVM is PID 1 and receives SIGTERM for graceful shutdown; JAVA_OPTS
# lets the Pi cap heap (e.g. -XX:MaxRAMPercentage=75) without rebuilding.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
