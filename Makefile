.PHONY: help version tag-and-push clean build dev test

help:
	@echo "Available commands:"
	@echo "  make version VERSION=x.y.z  - Create and push a git tag (e.g., make version VERSION=0.1.1)"
	@echo "  make build                  - Build the application"
	@echo "  make dev                    - Run development server"
	@echo "  make test                   - Run tests"
	@echo "  make clean                  - Clean build artifacts"

# Create git tag and push to origin
version:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION parameter is required"; \
		echo "Usage: make version VERSION=x.y.z"; \
		exit 1; \
	fi
	@echo "Updating version to $(VERSION)..."
	@# Update package.json version (only first occurrence)
	@sed -i '0,/"version": ".*"/s//"version": "$(VERSION)"/' package.json
	@echo "✓ Updated package.json"
	@# Update tauri.conf.json version (only first occurrence after productName)
	@sed -i '0,/"version": ".*"/s//"version": "$(VERSION)"/' src-tauri/tauri.conf.json
	@echo "✓ Updated src-tauri/tauri.conf.json"
	@# Update splashscreen version
	@bun run scripts/inject-version.js
	@echo "✓ Updated splashscreen version"
	@# Check if there are changes to commit
	@if git diff --quiet package.json src-tauri/tauri.conf.json static/splashscreen.html; then \
		echo "No version changes detected"; \
	else \
		echo "Committing version changes..."; \
		git add package.json src-tauri/tauri.conf.json static/splashscreen.html; \
		git commit -m "chore: bump version to $(VERSION)"; \
		echo "✓ Committed version changes"; \
	fi
	@echo "Creating git tag v$(VERSION)..."
	@git tag -a "v$(VERSION)" -m "Release v$(VERSION)"
	@echo "Pushing changes and tag to origin..."
	@git push origin $$(git branch --show-current)
	@git push origin "v$(VERSION)"
	@echo "✓ Tag v$(VERSION) created and pushed successfully!"

# Alias for version command
tag-and-push: version

# Build the application
build:
	@echo "Building application..."
	@bun run build

# Run development server
dev:
	@echo "Starting development server..."
	@bun run dev

# Run tests
test:
	@echo "Running tests..."
	@bun test

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf build/
	@rm -rf src-tauri/target/
	@echo "Clean complete!"
