# List available recipes
default:
    just --list

# Install all workspace dependencies
install:
    pnpm install

# Run the web app's dev server (Vite, http://localhost:5173)
dev-web:
    pnpm --filter web dev

# Run the API's dev server (http://localhost:3001)
dev-api:
    pnpm --filter api dev

# Run both dev servers in parallel (Ctrl-C stops both)
dev:
    just dev-api & just dev-web & wait

# Run all tests (web + api)
test:
    pnpm --filter web test:run
    pnpm --filter api test

# Type-check and build the web app for production
build:
    pnpm --filter web build

# Lint the web app
lint:
    pnpm --filter web lint
