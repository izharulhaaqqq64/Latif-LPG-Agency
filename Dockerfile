FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json server.js reset-password.js ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
RUN mkdir -p /data && chown node:node /data && chmod 700 /data
ENV NODE_ENV=production PORT=3000 LPG_DATA_DIR=/data
USER node
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
