# Use the official Node.js LTS (Long Term Support) image based on Alpine Linux for a smaller size
FROM node:20-alpine

# Set the working directory inside the Docker container
WORKDIR /app

# Copy the entire project into the container
# (.dockerignore will prevent copying unnecessary files like node_modules)
COPY . .

# Run the root build script which installs dependencies and builds both client and server
RUN npm run build

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port the server runs on
EXPOSE 5000

# Command to start the server
CMD ["npm", "start"]
