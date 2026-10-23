FROM node:18-alpine

WORKDIR /app

# Install dependencies only when needed
# We copy package files to install dependencies during the build
COPY package.json package-lock.json* ./
RUN npm install

# We do not COPY the rest of the application code because we use Docker volumes 
# for hot-reloading in development.

EXPOSE 3000

# Next.js development server
CMD ["npm", "run", "dev"]
