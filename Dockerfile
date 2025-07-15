FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma files
COPY prisma ./prisma/

# Copy source code
COPY . .

# Install dependencies
RUN npm install

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Use CMD to run prisma deploy and start the app
CMD ["sh", "-c", "npm run start:prod"]
