FROM node:20-slim

# Install system dependencies: curl, ffmpeg, python3
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy application files
COPY . .

# Download standalone yt-dlp Linux binary and make executable
RUN mkdir -p bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o ./bin/yt-dlp && \
    chmod +x ./bin/yt-dlp

# Build the client frontend
RUN npm run build

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
