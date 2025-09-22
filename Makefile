# ESO Log Aggregator Makefile
# This Makefile provides convenient commands for common development tasks
# Cross-platform compatible (Windows, Linux, macOS) with colorized output

# Cross-platform colorization utility
COLOR := node scripts/colorize.cjs

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
	@$(COLOR) header "ESO Log Aggregator - Available Commands"
	@$(COLOR) info "Development Commands:"
	@$(COLOR) color brightCyan "  help          - Show this help message"
	@$(COLOR) color brightCyan "  os-info       - Show detected operating system"
	@$(COLOR) color brightCyan "  dev           - Start development server"
	@$(COLOR) color brightCyan "  test          - Run tests"
	@$(COLOR) color brightCyan "  test-watch    - Run tests in watch mode"
	@$(COLOR) color brightCyan "  typecheck     - Run TypeScript type checking"
	@$(COLOR) info "Code Quality Commands:"
	@$(COLOR) color brightYellow "  lint          - Run ESLint to check code quality"
	@$(COLOR) color brightYellow "  lint-fix      - Run ESLint and automatically fix issues"
	@$(COLOR) color brightYellow "  format        - Format code with Prettier"
	@$(COLOR) color brightYellow "  fmt           - Alias for format"
	@$(COLOR) color brightYellow "  check         - Quick code quality checks (lint + test)"
	@$(COLOR) color brightYellow "  pre-commit    - Run full CI pipeline (lint-fix, format, typecheck)"
	@$(COLOR) color brightYellow "  pc            - Alias for pre-commit"
	@$(COLOR) info "Build Commands:"
	@$(COLOR) color brightGreen "  install       - Install dependencies"
	@$(COLOR) color brightGreen "  build         - Build the project for production"
	@$(COLOR) color brightGreen "  prod-build    - Production build with optimizations"
	@$(COLOR) color brightGreen "  codegen       - Generate GraphQL types"
	@$(COLOR) color brightGreen "  fetch-abilities - Fetch abilities data"
	@$(COLOR) info "Cleanup Commands:"
	@$(COLOR) color brightRed "  clean         - Clean build artifacts"
	@$(COLOR) color brightRed "  clean-cache   - Clear npm cache"
	@$(COLOR) color brightRed "  clean-modules - Remove node_modules"
	@$(COLOR) color brightRed "  clean-all     - Remove all generated files"
	@$(COLOR) color brightRed "  reinstall     - Clean and reinstall dependencies"
	@$(COLOR) info "Workflow Commands:"
	@$(COLOR) color brightMagenta "  setup         - Initial project setup for new developers"
	@$(COLOR) color brightMagenta "  all           - Run clean, install, lint, test, and build"

# Show detected OS
os-info:
	@$(COLOR) info "Detected Operating System: $(DETECTED_OS)"

# Install dependencies
install:
	@$(COLOR) subheader "Installing Dependencies"
	@$(COLOR) info "Running npm ci..."
	npm ci

# Build the project
build:
	@$(COLOR) subheader "Building Project"
	@$(COLOR) info "Running production build..."
	npm run build

# Run tests (non-interactive)
test:
	@$(COLOR) subheader "Running Tests"
	@$(COLOR) info "Executing test suite..."
	npm run test

# Run tests in watch mode
test-watch:
	@$(COLOR) subheader "Running Tests in Watch Mode"
	@$(COLOR) info "Starting test watcher..."
	npm test

# Run linting
lint:
	@$(COLOR) subheader "Running ESLint"
	@$(COLOR) info "Checking code quality..."
	npm run lint

# Run linting with auto-fix
lint-fix:
	@$(COLOR) subheader "Running ESLint with Auto-fix"
	@$(COLOR) info "Fixing code quality issues..."
	npm run lint:fix

# Format code with Prettier
format:
	@$(COLOR) subheader "Formatting Code"
	@$(COLOR) info "Running Prettier formatter..."
	npm run format

# Alias for format
fmt: format

# Alias for pre-commit
pc: pre-commit

# Start development server
dev:
	@$(COLOR) subheader "Starting Development Server"
	@$(COLOR) info "Launching local development environment..."
	npm start

# Clean build artifacts
clean:
	@$(COLOR) subheader "Cleaning Build Artifacts"
	@$(COLOR) info "Detected OS: $(DETECTED_OS)"
	@$(COLOR) warning "Removing build files, cache, and lint artifacts..."
	$(RM_CMD)
	$(RM_CACHE)
	$(RM_ESLINT)

# Generate GraphQL types
codegen:
	@$(COLOR) subheader "Generating GraphQL Types"
	@$(COLOR) info "Running code generation..."
	npm run codegen

# Fetch abilities data
fetch-abilities:
	@$(COLOR) subheader "Fetching Abilities Data"
	@$(COLOR) info "Downloading latest abilities data..."
	npm run fetch-abilities

# Run TypeScript type checking
typecheck:
	@$(COLOR) subheader "Running TypeScript Type Check"
	@$(COLOR) info "Validating TypeScript types..."
	npm run typecheck

# Run full CI pipeline
pre-commit: 
	@$(COLOR) header "Running Pre-Commit Pipeline"
	@$(COLOR) step 1 3 "Running ESLint with auto-fix..."
	npm run lint:fix
	@$(COLOR) step 2 3 "Running TypeScript type check..."
	npm run typecheck
	@$(COLOR) step 3 3 "Running Prettier formatter..."
	npm run format
	@$(COLOR) success "All pre-commit tasks completed successfully!"

# Run full CI pipeline
all: clean install lint test build
	@$(COLOR) success "All tasks completed successfully!"

# Development workflow - quick checks before committing
check: lint test
	@$(COLOR) success "Code quality checks passed!"

# Production build with optimizations
prod-build: clean install
	@$(COLOR) subheader "Production Build"
	@$(COLOR) info "Building for production with optimizations..."
ifeq ($(OS),Windows_NT)
	set NODE_ENV=production && npm run build
else
	NODE_ENV=production npm run build
endif

# Quick start for new developers
setup: install codegen fetch-abilities
	@$(COLOR) header "Project Setup Complete"
	@$(COLOR) success "Setup complete! Run 'make dev' to start development server."

# Cross-platform npm cache clear
clear-cache:
	@$(COLOR) subheader "Clearing NPM Cache"
	@$(COLOR) warning "Forcing npm cache clean..."
	npm cache clean --force

# Cross-platform node_modules cleanup
clean-modules:
	@$(COLOR) subheader "Removing Node Modules"
	@$(COLOR) warning "Deleting node_modules directory..."
ifeq ($(OS),Windows_NT)
	if exist node_modules rmdir /s /q node_modules
else
	rm -rf node_modules
endif

# Full clean - removes all generated files
clean-all: clean clean-modules
	@$(COLOR) success "All generated files removed!"

# Reinstall everything from scratch
reinstall: clean-modules install
	@$(COLOR) success "Dependencies reinstalled!"
