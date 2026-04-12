FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY server.mjs .
EXPOSE 3001
CMD ["node", "server.mjs"]
