# MCP Tools - Documentation Index

**Last Updated**: November 12, 2025  
**Purpose**: Central navigation for Model Context Protocol (MCP) tool documentation

---

## 📚 Available Guides

### Authentication & Setup
- **[Playwright Auth Setup](./AI_MCP_PLAYWRIGHT_AUTH_SETUP.md)** - Complete guide for setting up Microsoft Playwright MCP authentication
- **[Quick Reference](./AI_MCP_QUICK_REFERENCE.md)** - Fast lookup for common configurations and troubleshooting

---

## 🔧 MCP Servers in Use

This project integrates with several MCP servers for enhanced AI agent capabilities:

### 1. **Microsoft Playwright MCP Server**
**Package**: `@modelcontextprotocol/server-playwright`  
**Purpose**: Browser automation for interacting with the ESO Log Aggregator application  
**Status**: ✅ Configured

**Key Features**:
- Navigate and interact with application pages
- Take screenshots and snapshots
- Authenticate with OAuth and store tokens
- Debug UI and test flows interactively

**Authentication Note**: This documentation covers authenticating **your application** (ESO Log Aggregator) when using the MCP browser tool, not authenticating the MCP tool itself.

**Documentation**:
- [Application Authentication Setup](./AI_MCP_PLAYWRIGHT_AUTH_SETUP.md)
- [Playwright Testing Guide](../playwright/AI_PLAYWRIGHT_INSTRUCTIONS.md)

### 2. **Sentry MCP Server**
**Package**: `@modelcontextprotocol/server-sentry`  
**Purpose**: Error tracking and monitoring  
**Status**: ✅ Available

**Key Features**:
- Issue search and analysis
- Error details retrieval
- Release management
- Performance monitoring

### 3. **GitKraken MCP Server**
**Purpose**: Git operations and PR management  
**Status**: ✅ Available

**Key Features**:
- Git status and history
- Pull request management
- Branch operations
- Worktree management

### 4. **Atlassian MCP Server**
**Purpose**: Jira and Confluence integration  
**Status**: ✅ Configured

**Key Features**:
- Jira work item management
- Search issues and projects
- Confluence documentation access
- Comment and transition management

**Documentation**:
- [Jira ACLI Instructions](../jira/AI_JIRA_ACLI_INSTRUCTIONS.md)

### 5. **Pylance MCP Server**
**Purpose**: Python language server integration  
**Status**: ℹ️ Available (if Python files present)

**Key Features**:
- Type checking
- Code analysis
- Import management
- Python environment management

---

## 🎯 Quick Start

### For New AI Agents

1. **Review this index** to understand available MCP tools
2. **Check authentication requirements** for each server
3. **Follow setup guides** for servers you'll use
4. **Test connectivity** before extensive operations
5. **Refer to quick reference** for common tasks

### For Specific Tasks

**Need to run browser tests?**
→ [Playwright Auth Setup](./AI_MCP_PLAYWRIGHT_AUTH_SETUP.md)

**Need to manage Jira tickets?**
→ [Jira ACLI Instructions](../jira/AI_JIRA_ACLI_INSTRUCTIONS.md)

**Need to track errors?**
→ Use Sentry MCP tools directly

**Need to manage Git operations?**
→ Use GitKraken MCP tools or CLI

---

## 🔐 Security Guidelines

### Token Management
- **Never commit** authentication tokens to version control
- **Store securely** in environment variables or VS Code settings
- **Rotate regularly** for production environments
- **Audit usage** periodically

### Access Control
- Only request **minimum required permissions**
- **Review prompts** before approving access
- **Revoke unused** tokens promptly
- **Report suspicious** activity

---

## 🆘 Getting Help

### Troubleshooting Steps
1. Check [Quick Reference](./AI_MCP_QUICK_REFERENCE.md) for common issues
2. Review specific tool documentation
3. Verify VS Code settings.json configuration
4. Test with minimal configuration
5. Check MCP server logs

### Common Issues

**Authentication Failures**
→ See [Playwright Auth Setup - Troubleshooting](./AI_MCP_PLAYWRIGHT_AUTH_SETUP.md#troubleshooting)

**Server Not Responding**
→ Restart VS Code and verify server installation

**Permission Errors**
→ Re-authenticate with interactive flow

---

## 📖 Related Documentation

- **[AI Agent Guidelines](../AI_AGENT_GUIDELINES.md)** - General guidelines for AI agents
- **[Documentation Index](../../INDEX.md)** - Complete project documentation
- **[Agent Setup Summary](../AI_AGENT_SETUP_SUMMARY.md)** - Complete agent onboarding

---

## 🔄 Maintenance

### When to Update This Documentation

✅ **Update when**:
- New MCP servers are added to project
- Authentication requirements change
- Major configuration updates occur
- Security policies are updated

❌ **Don't update for**:
- Minor version bumps
- Individual token generations
- Temporary configuration changes
- User-specific settings

---

**Last Review**: November 12, 2025  
**Next Review**: When new MCP servers are integrated
