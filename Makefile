# ESO Log Aggregator Makefile
# This Makefile provides convenient commands for common development tasks

.PHONY: help install build test lint lint-fix format clean dev codegen fetch-abilities all

# Default target
help:
	@echo "Available commands:"
	@echo "  help          - Show this help message"
	@echo "  install       - Install dependencies"
	@echo "  build         - Build the project for production"
	@echo "  test          - Run tests"
	@echo "  test-watch    - Run tests in watch mode"
	@echo "  lint          - Run ESLint to check code quality"
	@echo "  lint-fix      - Run ESLint and automatically fix issues"
	@echo "  format        - Format code with Prettier"
	@echo "  dev           - Start development server"
	@echo "  clean         - Clean build artifacts"
	@echo "  codegen       - Generate GraphQL types"
	@echo "  fetch-abilities - Fetch abilities data"
	@echo "  pre-commit    - Run full CI pipeline (lint-fix, test, build, typecheck)"
	@echo "  all           - Run clean, install, lint, test, and build"

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

# Start development server
dev:
	@echo "Starting development server..."
	npm start

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf build/
	rm -rf node_modules/.cache/
	rm -rf .eslintcache

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
	@echo "1/5 - Running ESLint with auto-fix..."
	npm run lint:fix
	@echo "2/5 - Running tests..."
	npm run test
	@echo "3/5 - Building project..."
	npm run build
	@echo "4/5 - Running type check..."
	npm run typecheck
	@echo "4/5 - Running formatter ..."
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
	NODE_ENV=production npm run build

# Quick start for new developers
setup: install codegen fetch-abilities
	@echo "✅ Project setup complete! Run 'make dev' to start development server."
