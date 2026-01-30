FROM node:24-alpine

WORKDIR /workspace

# This is for caching. The volume mount will overlay this, but the named volume for node_modules will be populated from this on the first run.
# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm install
RUN apk add tmux
