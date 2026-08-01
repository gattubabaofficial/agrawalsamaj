FROM node:18-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

CMD ["npm", "start"]
