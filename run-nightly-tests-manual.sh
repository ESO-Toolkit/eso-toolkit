#!/bin/bash

# Run nightly regression tests manually with various options
#
# Usage:
#   ./run-nightly-tests-manual.sh [options]
#
# Options:
#   -s, --suite <suite>    Test suite to run (all, chromium, firefox, webkit, mobile, auth-only)
#   -h, --headed          Run tests in headed mode (for debugging)
#   -d, --debug           Enable debug mode (single failure, more verbose)
#   -b, --build           Build the application before running tests
#   --help                Show this help message
#
# Examples:
#   ./run-nightly-tests-manual.sh
#   ./run-nightly-tests-manual.sh --suite chromium --headed
#   ./run-nightly-tests-manual.sh --suite auth-only --debug --build

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_SUITE="all"
HEADED=false
DEBUG=false
BUILD_FIRST=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        -h|--headed)
            HEADED=true
            shift
            ;;
        -d|--debug)
            DEBUG=true
            shift
            ;;
        -b|--build)
            BUILD_FIRST=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -s, --suite <suite>    Test suite to run (all, chromium, firefox, webkit, mobile, auth-only)"
            echo "  -h, --headed          Run tests in headed mode (for debugging)"
            echo "  -d, --debug           Enable debug mode (single failure, more verbose)"
            echo "  -b, --build           Build the application before running tests"
            echo "  --help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0"
            echo "  $0 --suite chromium --headed"
            echo "  $0 --suite auth-only --debug --build"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🌙 Nightly Regression Tests - Manual Run${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Validate test suite
case $TEST_SUITE in
    all|chromium|firefox|webkit|mobile|auth-only)
        ;;
    *)
        echo -e "${RED}❌ Error: Invalid test suite '$TEST_SUITE'${NC}"
        echo "Valid options: all, chromium, firefox, webkit, mobile, auth-only"
        exit 1
        ;;
esac

# Check for required environment variables
echo -e "${BLUE}🔍 Checking environment...${NC}"

if [ -n "$OAUTH_CLIENT_ID" ] && [ -n "$OAUTH_CLIENT_SECRET" ]; then
    echo -e "${GREEN}✅ OAuth credentials found${NC}"
else
    echo -e "${YELLOW}⚠️  OAuth credentials not found - some tests may be skipped${NC}"
    echo "   Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET for full authentication testing"
fi

if [ -n "$ESO_LOGS_TEST_EMAIL" ] && [ -n "$ESO_LOGS_TEST_PASSWORD" ]; then
    echo -e "${GREEN}✅ Test user credentials found${NC}"
else
    echo -e "${YELLOW}⚠️  Test user credentials not found - browser flow tests may be skipped${NC}"
    echo "   Set ESO_LOGS_TEST_EMAIL and ESO_LOGS_TEST_PASSWORD for browser authentication testing"
fi

# Build application if requested
if [ "$BUILD_FIRST" = true ]; then
    echo -e "${BLUE}🔨 Building application...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build completed${NC}"
fi

# Determine the test command
case $TEST_SUITE in
    "all")
        TEST_COMMAND="test:nightly:all"
        ;;
    "chromium")
        TEST_COMMAND="test:nightly:chromium"
        ;;
    "firefox")
        TEST_COMMAND="test:nightly:firefox"
        ;;
    "webkit")
        TEST_COMMAND="test:nightly:webkit"
        ;;
    "mobile")
        TEST_COMMAND="test:nightly:mobile"
        ;;
    "auth-only")
        TEST_COMMAND="test:nightly:auth"
        ;;
    *)
        TEST_COMMAND="test:nightly:all"
        ;;
esac

# Override for special modes
if [ "$HEADED" = true ]; then
    TEST_COMMAND="test:nightly:headed"
    echo -e "${YELLOW}🖥️  Running in headed mode${NC}"
fi

if [ "$DEBUG" = true ]; then
    TEST_COMMAND="test:nightly:debug"
    echo -e "${YELLOW}🐛 Running in debug mode${NC}"
fi

echo -e "${BLUE}🧪 Running tests: npm run $TEST_COMMAND${NC}"
echo -e "${BLUE}================================================${NC}"

# Start timestamp
START_TIME=$(date +%s)

# Run the tests
set +e
npm run "$TEST_COMMAND"
EXIT_CODE=$?
set -e

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo -e "${BLUE}================================================${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Tests completed successfully${NC}"
else
    echo -e "${RED}❌ Tests failed with exit code $EXIT_CODE${NC}"
fi

printf "${BLUE}⏱️  Duration: %02d:%02d${NC}\n" $MINUTES $SECONDS

# Show report options
echo -e "${BLUE}📊 View results:${NC}"
echo "   • HTML Report: npm run test:nightly:report"
echo "   • Test Results: ./test-results-nightly/"
echo "   • Screenshots: ./test-results-nightly/**/test-failed-*.png"

exit $EXIT_CODE
