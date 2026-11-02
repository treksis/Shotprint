# The per-project Muse Code sandbox: Muse Code CLI, ffmpeg, Chromium, Python and the Colab CLI (for the H3 GPU box).
#   docker build -t muse-harness sandbox/image   (npm run sandbox:image)
#   The Studio starts one container per project from this image (src/worker/sandbox/docker.ts).
# glibc base (Muse Code's Linux sandbox needs bubblewrap and a non-musl build).
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg chromium python3 perl openssh-client curl ca-certificates git bubblewrap jq procps \
    && rm -rf /var/lib/apt/lists/*

# Colab CLI (same package as the Mac's ~/.local/bin/colab), for the H3 box.
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh \
    && UV_TOOL_BIN_DIR=/usr/local/bin uv tool install google-colab-cli

# Muse Code CLI.
RUN curl -fsSL https://dev.meta.ai/install.sh | MUSE_INSTALL_DIR=/usr/local/bin bash \
    && muse --version

# ssh to colab-<session> goes through the Colab CLI proxy, one multiplexed connection per box.
# The launch scripts create a throwaway key per container (the Colab CLI registers it with the box);
# the host's own keys are never mounted.
RUN mkdir -p /root/.ssh && printf '%s\n' \
    'Host colab-*' \
    '    User root' \
    '    ProxyCommand sh -c "colab ssh --proxy-mode -s $(echo %h | sed s/^colab-//)"' \
    '    ControlMaster auto' \
    '    ControlPath /root/.ssh/cm-%h' \
    '    ControlPersist 10m' \
    '    StrictHostKeyChecking no' \
    '    UserKnownHostsFile /dev/null' \
    '    LogLevel ERROR' > /root/.ssh/config && chmod 600 /root/.ssh/config

ENV CHROME_BIN=/usr/bin/chromium \
    COLAB_REPO_DIR=/colab \
    HOME=/root
WORKDIR /work/lab/v1
