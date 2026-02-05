# Documentation Skill Setup Guide

Quick guide to configure the Documentation Skill for both Claude Desktop and GitHub Copilot.

## ✅ Installation Complete

The skill has been installed in both:
- `.claude/documentation/` - Claude Desktop
- `.copilot/documentation/` - GitHub Copilot

## 🔧 Configuration

### For Claude Desktop

1. **Locate your config file:**
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add this configuration:**
   ```json
   {
     "mcpServers": {
       "eso-documentation": {
         "command": "node",
         "args": [
           "D:\\code\\eso-log-aggregator\\.claude\\documentation\\index.js"
         ],
         "cwd": "D:\\code\\eso-log-aggregator\\.claude\\documentation"
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### For GitHub Copilot (VS Code)

The skill is automatically available through workspace configuration.

## 🎯 Usage

```
@workspace Where should I put AI_SCRIBING_INSTRUCTIONS.md?
@workspace Create documentation for FEATURE_NAME.md
@workspace Show documentation structure
```

## 📚 Full Documentation

See [.claude/documentation/README.md](.claude/documentation/README.md) for complete usage guide.
