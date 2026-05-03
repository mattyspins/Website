# Use Node.js 20 LTS
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

# Expose port
EXPOSE 3001

# Start command (migrations + start)
CMD ["./start.sh"]
