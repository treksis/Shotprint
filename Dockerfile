# Cloudflare Sandbox SDK 1.0 MicroVM Image for Shotprint Video Studio
FROM debian:bookworm-slim

# Copy the official @cloudflare/sandbox 1.0.3 runtime shim
COPY --from=docker.io/cloudflare/sandbox:1.0.3 /usr/local/bin/sandbox-shim /usr/local/bin/sandbox-shim

# Install FFmpeg (for frame extraction & MP4 stitching) and Python 3
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /workspace
WORKDIR /workspace

CMD ["sleep", "infinity"]
