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

.PHONY: help install build test test-all lint lint-fix format fmt clean dev codegen fetch-abilities all os-info clear-cache clean-modules clean-all reinstall pre-commit pc check prod-build setup test-watch typecheck pr clean-test-data test-screen-sizes test-screen-sizes-mobile test-screen-sizes-tablet test-screen-sizes-desktop test-screen-sizes-report test-screen-sizes-update

# Default target
help:
	@$(COLOR) header "ESO Log Aggregator - Available Commands"
	@$(COLOR) info "Development Commands:"
	@$(COLOR) color brightCyan "  help          - Show this help message"
	@$(COLOR) color brightCyan "  os-info       - Show detected operating system"
	@$(COLOR) color brightCyan "  dev           - Start development server"
	@$(COLOR) color brightCyan "  test          - Run tests"
	@$(COLOR) color brightCyan "  test-all      - Run all unit tests (no watch)"
	@$(COLOR) color brightCyan "  test-watch    - Run tests in watch mode"
	@$(COLOR) color brightCyan "  typecheck     - Run TypeScript type checking"
	@$(COLOR) info "Code Quality Commands:"
	@$(COLOR) color brightYellow "  lint          - Run ESLint to check code quality"
	@$(COLOR) color brightYellow "  lint-fix      - Run ESLint and automatically fix issues"
	@$(COLOR) color brightYellow "  format        - Format code with Prettier"
	@$(COLOR) color brightYellow "  fmt           - Alias for format"
	@$(COLOR) color brightYellow "  check         - Quick code quality checks (lint + test)"
	@$(COLOR) color brightYellow "  pre-commit    - Run full CI pipeline (lint-fix, typecheck, format)"
	@$(COLOR) color brightYellow "  pc            - Alias for pre-commit"
	@$(COLOR) info "Build Commands:"
	@$(COLOR) color brightGreen "  install       - Install dependencies"
	@$(COLOR) color brightGreen "  build         - Build the project for production"
	@$(COLOR) color brightGreen "  prod-build    - Production build with optimizations"
	@$(COLOR) color brightGreen "  codegen       - Generate GraphQL types"
	@$(COLOR) color brightGreen "  fetch-abilities - Fetch abilities data"
	@$(COLOR) info "Cleanup Commands:"
	@$(COLOR) color brightRed "  clean         - Clean build artifacts"
	@$(COLOR) color brightRed \"  clear-cache   - Clear npm cache\"
	@$(COLOR) color brightRed "  clean-modules - Remove node_modules"
	@$(COLOR) color brightRed "  clean-all     - Remove all generated files"
	@$(COLOR) color brightRed "  clean-test-data - Clean test artifacts and old test data"
	@$(COLOR) color brightRed "  reinstall     - Clean and reinstall dependencies"
	@$(COLOR) info "Workflow Commands:"
	@$(COLOR) color brightMagenta "  setup         - Initial project setup for new developers"
	@$(COLOR) color brightMagenta "  all           - Run clean, install, lint, test, and build"
	@$(COLOR) color brightMagenta "  pr            - Create a pull request using twig"
	@$(COLOR) info "Screen Size Testing Commands:"
	@$(COLOR) color brightBlue "  test-screen-sizes         - Run all screen size validation tests"
	@$(COLOR) color brightBlue "  test-screen-sizes-mobile  - Test mobile device screen sizes"
	@$(COLOR) color brightBlue "  test-screen-sizes-tablet  - Test tablet device screen sizes"
	@$(COLOR) color brightBlue "  test-screen-sizes-desktop - Test desktop screen sizes"
	@$(COLOR) color brightBlue "  test-screen-sizes-report  - View screen size test report"

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

# Run full unit test suite (no watch, no onlyChanged)
test-all:
	@$(COLOR) subheader "Running Full Unit Test Suite"
	@$(COLOR) info "Executing all Jest tests..."
	npm run test:all

# Run tests in watch mode
test-watch:
	@$(COLOR) subheader "Running Tests in Watch Mode"
	@$(COLOR) info "Starting test watcher..."
	npm run test:watch

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
	npm run dev

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

# Create a pull request using twig
pr:
	@$(COLOR) subheader "Creating Pull Request"
	@$(COLOR) info "Running gh pr create..."
	gh pr create --fill

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

# Clean test data and artifacts
clean-test-data:
	@$(COLOR) subheader "Cleaning Test Data and Artifacts"
	@$(COLOR) info "Running cleanup script..."
ifeq ($(OS),Windows_NT)
	pwsh -File scripts/cleanup-test-data.ps1 -Force
else
	pwsh scripts/cleanup-test-data.ps1 -Force
endif

# Screen Size Testing Commands
test-screen-sizes:
	@$(COLOR) subheader "Running Screen Size Validation Tests"
	@$(COLOR) info "Testing responsive layout across all device sizes..."
	npm run test:screen-sizes

test-screen-sizes-mobile:
	@$(COLOR) subheader "Testing Mobile Screen Sizes"
	@$(COLOR) info "Running tests for mobile devices..."
	npm run test:screen-sizes:mobile

test-screen-sizes-tablet:
	@$(COLOR) subheader "Testing Tablet Screen Sizes"
	@$(COLOR) info "Running tests for tablet devices..."
	npm run test:screen-sizes:tablet

test-screen-sizes-desktop:
	@$(COLOR) subheader "Testing Desktop Screen Sizes"
	@$(COLOR) info "Running tests for desktop sizes..."
	npm run test:screen-sizes:desktop

test-screen-sizes-report:
	@$(COLOR) subheader "Opening Screen Size Test Report"
	@$(COLOR) info "Launching HTML report in browser..."
	npm run test:screen-sizes:report

test-screen-sizes-update:
	@$(COLOR) subheader "Updating Screen Size Test Snapshots"
	@$(COLOR) warning "Updating visual regression baselines..."
	npm run test:screen-sizes:update-snapshots
