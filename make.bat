@echo off
REM ESO Log Aggregator Build Script for Windows Command Prompt

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="build" goto build
if "%1"=="test" goto test
if "%1"=="test-watch" goto test-watch
if "%1"=="lint" goto lint
if "%1"=="lint-fix" goto lint-fix
if "%1"=="format" goto format
if "%1"=="dev" goto dev
if "%1"=="clean" goto clean
if "%1"=="storybook" goto storybook
if "%1"=="build-storybook" goto build-storybook
if "%1"=="codegen" goto codegen
if "%1"=="fetch-abilities" goto fetch-abilities
if "%1"=="all" goto all
if "%1"=="check" goto check
if "%1"=="setup" goto setup

echo Unknown command: %1
echo Run 'build.bat help' to see available commands.
exit /b 1

:help
echo Available commands:
echo   help          - Show this help message
echo   install       - Install dependencies
echo   build         - Build the project for production
echo   test          - Run tests
echo   test-watch    - Run tests in watch mode
echo   lint          - Run ESLint to check code quality
echo   lint-fix      - Run ESLint and automatically fix issues
echo   format        - Format code with Prettier
echo   dev           - Start development server
echo   clean         - Clean build artifacts
echo   storybook     - Start Storybook development server
echo   build-storybook - Build Storybook for production
echo   codegen       - Generate GraphQL types
echo   fetch-abilities - Fetch abilities data
echo   all           - Run clean, install, lint, test, and build
echo   check         - Run lint and test (quick pre-commit check)
echo   setup         - Setup project for new developers
exit /b 0

:install
echo Installing dependencies...
npm ci
exit /b %errorlevel%

:build
echo Building project...
npm run build
exit /b %errorlevel%

:test
echo Running tests...
npm run test
exit /b %errorlevel%

:test-watch
echo Running tests in watch mode...
npm test
exit /b %errorlevel%

:lint
echo Running ESLint...
npm run lint
exit /b %errorlevel%

:lint-fix
echo Running ESLint with auto-fix...
npm run lint:fix
exit /b %errorlevel%

:format
echo Formatting code with Prettier...
npm run format
exit /b %errorlevel%

:dev
echo Starting development server...
npm start
exit /b %errorlevel%

:clean
echo Cleaning build artifacts...
if exist build rmdir /s /q build
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist .eslintcache del .eslintcache
exit /b 0

:storybook
echo Starting Storybook...
npm run storybook
exit /b %errorlevel%

:build-storybook
echo Building Storybook...
npm run build-storybook
exit /b %errorlevel%

:codegen
echo Generating GraphQL types...
npm run codegen
exit /b %errorlevel%

:fetch-abilities
echo Fetching abilities data...
npm run fetch-abilities
exit /b %errorlevel%

:all
call :clean
call :install
call :lint
if %errorlevel% neq 0 exit /b %errorlevel%
call :test
if %errorlevel% neq 0 exit /b %errorlevel%
call :build
if %errorlevel% neq 0 exit /b %errorlevel%
echo ✅ All tasks completed successfully!
exit /b 0

:check
call :lint
if %errorlevel% neq 0 exit /b %errorlevel%
call :test
if %errorlevel% neq 0 exit /b %errorlevel%
echo ✅ Code quality checks passed!
exit /b 0

:setup
call :install
if %errorlevel% neq 0 exit /b %errorlevel%
call :codegen
if %errorlevel% neq 0 exit /b %errorlevel%
call :fetch-abilities
if %errorlevel% neq 0 exit /b %errorlevel%
echo ✅ Project setup complete! Run 'build.bat dev' to start development server.
exit /b 0
