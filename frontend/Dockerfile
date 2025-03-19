# Stage 1: Build the Next.js app
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies for caching
COPY package*.json ./
RUN npm install

# Copy the remaining source code and build the app
COPY . .
# RUN npm run build     # comment out for development

# Stage 2: Run the Next.js app
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy the build artifacts and dependencies from the builder stage
# can comment out for development

# COPY --from=builder /app/next.config.ts ./
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# CMD npm run build && npm run start # for prod
CMD npm run dev
