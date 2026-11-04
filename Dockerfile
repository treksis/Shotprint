# A project's microVM on Cloudflare Containers: the Studio session server and Muse Code side by side.
# Built and pushed by `wrangler deploy` (wrangler.jsonc → containers). Local dev uses sandbox/image instead.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 perl curl ca-certificates git jq procps \
    && rm -rf /var/lib/apt/lists/*

# Muse Code CLI.
RUN curl -fsSL https://dev.meta.ai/install.sh | MUSE_INSTALL_DIR=/usr/local/bin bash \
    && muse --version

WORKDIR /app
COPY sandbox/host sandbox/host
COPY sandbox/kit sandbox/kit
COPY sandbox/templates sandbox/templates
COPY sandbox/seeds sandbox/seeds
# npm run cf:vm bundles src/worker/vm-server.ts.
COPY .cf/vm-server.mjs vm-server.mjs

ENV STUDIO_SANDBOX_RUNTIME=local PORT=8080 HOME=/root
EXPOSE 8080
CMD ["node", "vm-server.mjs"]
