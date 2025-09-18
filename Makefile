# ESO Log Aggregator Makefile
# This Makefile provides convenient commands for common development tasks
# Cross-platform compatible (Windows, Linux, macOS)

# Detect OS for cross-platform compatibility
ifeq ($(OS),Windows_NT)
	DETECTED_OS := Windows
	RM_CMD := if exist build rmdir /s /q build
	RM_CACHE := if exist node_modules\.cache rmdir /s /q node_modules\.cache
	RM_ESLINT := if exist .eslintcache del /q .eslintcache
else
	DETECTED_OS := $(shell uname -s)
	RM_CMD := rm -rf build/
	RM_CACHE := rm -rf node_modules/.cache/
	RM_ESLINT := rm -rf .eslintcache
endif

.PHONY: help install build test lint lint-fix format fmt clean dev codegen fetch-abilities all os-info clean-cache clear-cache clean-modules clean-all reinstall pre-commit pc check prod-build setup test-watch typecheck

# Default target
help:
	@echo "Available commands:"
	@echo "  help          - Show this help message"
	@echo "  os-info       - Show detected operating system"
	@echo "  install       - Install dependencies"
	@echo "  build         - Build the project for production"
	@echo "  test          - Run tests"
	@echo "  test-watch    - Run tests in watch mode"
	@echo "  lint          - Run ESLint to check code quality"
	@echo "  lint-fix      - Run ESLint and automatically fix issues"
	@echo "  format        - Format code with Prettier"
	@echo "  fmt           - Alias for format"
	@echo "  dev           - Start development server"
	@echo "  clean         - Clean build artifacts"
	@echo "  clean-cache   - Clear npm cache"
	@echo "  clean-modules - Remove node_modules"
	@echo "  clean-all     - Remove all generated files"
	@echo "  reinstall     - Clean and reinstall dependencies"
	@echo "  codegen       - Generate GraphQL types"
	@echo "  fetch-abilities - Fetch abilities data"
	@echo "  typecheck     - Run TypeScript type checking"
	@echo "  pre-commit    - Run full CI pipeline (lint-fix, format, typecheck)"
	@echo "  pc            - Alias for pre-commit"
	@echo "  check         - Quick code quality checks (lint + test)"
	@echo "  prod-build    - Production build with optimizations"
	@echo "  setup         - Initial project setup for new developers"
	@echo "  all           - Run clean, install, lint, test, and build"

# Show detected OS
os-info:
	@echo "Detected OS: $(DETECTED_OS)"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm ci

# Build the project
build:
	@echo "Building project..."
	npm run build

# Run tests (non-interactive)
test:
	@echo "Running tests..."
	npm run test

# Run tests in watch mode
test-watch:
	@echo "Running tests in watch mode..."
	npm test

# Run linting
lint:
	@echo "Running ESLint..."
	npm run lint

# Run linting with auto-fix
lint-fix:
	@echo "Running ESLint with auto-fix..."
	npm run lint:fix

# Format code with Prettier
format:
	@echo "Formatting code with Prettier..."
	npm run format

# Alias for format
fmt: format

# Alias for pre-commit
pc: pre-commit

# Start development server
dev:
	@echo "Starting development server..."
	npm start

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@echo "Detected OS: $(DETECTED_OS)"
	$(RM_CMD)
	$(RM_CACHE)
	$(RM_ESLINT)

# Generate GraphQL types
codegen:
	@echo "Generating GraphQL types..."
	npm run codegen

# Fetch abilities data
fetch-abilities:
	@echo "Fetching abilities data..."
	npm run fetch-abilities

# Fetch abilities data
typecheck:
	npm run typecheck

# Run full CI pipeline
pre-commit: 
	@echo "Running pre-commit checks..."
	@echo "1/3 - Running ESLint with auto-fix..."
	npm run lint:fix
	@echo "2/3 - Running type check..."
	npm run typecheck
	@echo "3/3 - Running formatter ..."
	npm run format
	@echo "✅ All pre-commit tasks completed successfully!"

# Run full CI pipeline
all: clean install lint test build
	@echo "✅ All tasks completed successfully!"

# Development workflow - quick checks before committing
check: lint test
	@echo "✅ Code quality checks passed!"

# Production build with optimizations
prod-build: clean install
	@echo "Building for production..."
ifeq ($(OS),Windows_NT)
	set NODE_ENV=production && npm run build
else
	NODE_ENV=production npm run build
endif

# Quick start for new developers
setup: install codegen fetch-abilities
	@echo "✅ Project setup complete! Run 'make dev' to start development server."

# Cross-platform npm cache clear
clear-cache:
	@echo "Clearing npm cache..."
	npm cache clean --force

# Cross-platform node_modules cleanup
clean-modules:
	@echo "Removing node_modules..."
ifeq ($(OS),Windows_NT)
	if exist node_modules rmdir /s /q node_modules
else
	rm -rf node_modules
endif

# Full clean - removes all generated files
clean-all: clean clean-modules
	@echo "✅ All generated files removed!"

# Reinstall everything from scratch
reinstall: clean-modules install
	@echo "✅ Dependencies reinstalled!"
