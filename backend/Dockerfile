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

# Set environment to production
ENV NODE_ENV=production

# Railway will assign PORT dynamically, don't expose a specific port
# The application will bind to the PORT environment variable

# Start the application directly
CMD ["node", "dist/index.js"]
