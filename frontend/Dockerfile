# Stage 1: Build the Next.js app
FROM node:latest AS builder
WORKDIR /app

# Install dependencies for caching
COPY package*.json ./
RUN npm install

# Copy the remaining source code and build the app
COPY . .
RUN npm run build

# Stage 2: Run the Next.js app
FROM node:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy the build artifacts and dependencies from the builder stage
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "dev"]
