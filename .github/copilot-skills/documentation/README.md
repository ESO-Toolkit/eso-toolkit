# Documentation Skill - MCP Server

**Intelligent documentation organization for ESO Log Aggregator**

Automatically recommends and creates documentation in the correct project locations based on filename patterns, content analysis, and project conventions.

## 🎯 What It Does

- **Analyzes** documentation filenames and content
- **Recommends** optimal locations based on project structure
- **Creates** documentation files in correct directories
- **Validates** placement against project conventions
- **Warns** when INDEX.md needs updating

## 🚀 Quick Start

### In Claude Desktop

```
@workspace Where should I put AI_SCRIBING_INSTRUCTIONS.md?
@workspace Create documentation for feature X in the correct location
@workspace Show me the documentation structure
```

### Available Commands

1. **Get Recommendations**
   ```
   @workspace Recommend location for "AI_FEATURE_GUIDE.md"
   ```

2. **Create Documentation**
   ```
   @workspace Create docs: filename="FEATURE.md" content="# Feature..."
   ```

3. **View Structure**
   ```
   @workspace Show documentation structure
   ```

## 📚 Documentation Categories

The skill understands these categories:

### AI Agents (`documentation/ai-agents/`)
- AI agent instructions and quick references
- Patterns: `AI_*_INSTRUCTIONS.md`, `AI_*_QUICK_REFERENCE.md`
- Subdirs: `scribing/`, `playwright/`, `preloading/`, `jira/`

### Features (`documentation/features/`)
- Feature-specific implementation docs
- Patterns: `FEATURE*.md`, `*_FEATURE.md`, `IMPLEMENTATION.md`
- Subdirs: `markers/`, `scribing/`, `grimoire/`, `logger/`

### Architecture (`documentation/architecture/`)
- System design and architectural patterns
- Patterns: `*ARCHITECTURE*.md`, `DESIGN.md`
- Examples: `system-architecture.md`, `data-flow.md`

### Implementation (`documentation/implementation/`)
- Jira ticket/epic implementation summaries
- Patterns: `ESO-XXX*IMPLEMENTATION*.md`, `EPIC*.md`
- Examples: `ESO-372_IMPLEMENTATION_SUMMARY.md`

### Fixes (`documentation/fixes/`)
- Bug fixes and issue resolutions
- Patterns: `FIX*.md`, `*_FIX.md`, `RESOLUTION*.md`

### Testing (`documentation/testing/`)
- Testing guides and strategies
- Patterns: `*TEST*.md`, `PLAYWRIGHT*.md`, `SMOKE*.md`

### Scripts (`scripts/`)
- Script documentation alongside script files
- Patterns: `README-*.md`
- Examples: `README-sync-jira-status.md`

### Root Reference (`documentation/`)
- High-level quick references
- Patterns: `*_QUICKSTART.md`, `DEPLOYMENT.md`, `COVERAGE*.md`

### Sessions (`documentation/sessions/`)
- Session summaries and handoffs
- Patterns: `SESSION*.md`, `HANDOFF*.md`, `YYYY-MM-DD*.md`

## 🔍 How It Works

### 1. Pattern Matching
```javascript
// Filename analysis
AI_SCRIBING_INSTRUCTIONS.md → ai-agents/scribing/
ESO-449_IMPLEMENTATION.md → implementation/
README-sync-jira.md → scripts/
```

### 2. Content Analysis
```javascript
// Keyword detection
Content contains "AI agent" → ai-agents/
Content contains "ESO-449" → implementation/
Content mentions "architecture" → architecture/
```

### 3. Scoring System
```javascript
// Recommendations scored by:
- Filename pattern match: +10 points
- Content keyword match: +3-5 points
- Subdirectory match: +10 points

// Top score wins
```

### 4. Subdirectory Detection
```javascript
// For categories with subdirs
filename: "AI_SCRIBING_GUIDE.md"
→ Recommends: documentation/ai-agents/scribing/

content: "...discusses markers..."
→ Recommends: documentation/features/markers/
```

## 📝 Example Usage

### Example 1: AI Agent Documentation
```
User: Where should I put AI_SCRIBING_INSTRUCTIONS.md?

Skill: 📍 Recommended Location for "AI_SCRIBING_INSTRUCTIONS.md"

🎯 Primary: documentation/ai-agents/
   Score: 10
   Reasons:
   - Filename matches ai-agents pattern

📁 Subdirectory Recommendations:
   - documentation/ai-agents/scribing/ (score: 10)
     • Filename contains "scribing"

📝 Examples:
   - AI_FEATURE_INSTRUCTIONS.md
   - AI_FEATURE_QUICK_REFERENCE.md
```

### Example 2: Implementation Summary
```
User: Create ESO-449_IMPLEMENTATION_SUMMARY.md

Skill: ✅ Created: documentation/implementation/ESO-449_IMPLEMENTATION_SUMMARY.md

📁 Location: documentation/implementation/ESO-449_IMPLEMENTATION_SUMMARY.md

⚠️  Consider adding to documentation/INDEX.md
   Add link: [ESO-449_IMPLEMENTATION_SUMMARY](implementation/ESO-449_IMPLEMENTATION_SUMMARY.md)
```

### Example 3: Script Documentation
```
User: Where does README-analyze-bundle.md go?

Skill: 📍 Recommended Location for "README-analyze-bundle.md"

🎯 Primary: scripts/
   Score: 10
   Reasons:
   - Filename matches scripts pattern

💡 Description: Script documentation (README alongside script file)
```

## 🛠️ Setup

### 1. Install Dependencies
```bash
cd .claude/documentation
npm install
```

### 2. Configure Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

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

**Config location:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

### 3. Restart Claude Desktop

The skill will be automatically available.

## 🎨 Integration Patterns

### Pattern 1: Before Creating Docs
```
1. Ask skill for recommendation
2. Review suggested location
3. Create with skill or manually
4. Update INDEX.md if needed
```

### Pattern 2: During Feature Development
```
1. Complete feature implementation
2. Ask skill where implementation summary goes
3. Create ESO-XXX_IMPLEMENTATION_SUMMARY.md
4. Ask skill where AI instructions go (if needed)
5. Create AI_FEATURE_INSTRUCTIONS.md
```

### Pattern 3: Script Documentation
```
1. Create script in scripts/
2. Ask skill for README location
3. Create README-script-name.md in scripts/
4. Reference in documentation/INDEX.md
```

## 🔧 Customization

Edit `index.js` to modify:

```javascript
// Add new categories
const DOC_STRUCTURE = {
  'custom-category': {
    path: 'documentation/custom',
    description: 'Custom documentation',
    patterns: [/CUSTOM.*\.md$/i],
    examples: ['CUSTOM_DOC.md'],
  },
  // ...
};

// Adjust scoring weights
if (pattern.test(filename)) {
  score += 10;  // Change weight
}
```

## 🐛 Troubleshooting

### Issue: Skill not appearing
```
1. Check claude_desktop_config.json syntax
2. Verify file paths are absolute
3. Restart Claude Desktop
4. Check Claude logs for errors
```

### Issue: Wrong recommendations
```
1. Check filename follows patterns
2. Provide content for better analysis
3. Override with targetPath parameter
4. Update patterns in index.js
```

### Issue: File creation fails
```
Error: File already exists
→ File already exists at that location

Error: Permission denied
→ Check directory permissions

Error: Path not found
→ Verify PROJECT_ROOT in index.js
```

## 📊 Decision Tree

```
Is it AI agent documentation?
├─ Yes → documentation/ai-agents/
│  └─ Feature-specific? → Create subdir
└─ No → Continue...

Does filename contain ESO-XXX?
├─ Yes → documentation/implementation/
└─ No → Continue...

Is it a script README?
├─ Yes → scripts/
└─ No → Continue...

Mentions testing?
├─ Yes → documentation/testing/
└─ No → Continue...

Contains "architecture"?
├─ Yes → documentation/architecture/
└─ No → documentation/ (default)
```

## 🤝 Related Skills

- **Jira Skill** - Work item management
- **Git Workflow Skill** - Branch management
- **Testing Skill** - E2E test automation

## 📄 License

Part of the ESO Log Aggregator project.

---

**Pro Tip**: Use this skill before creating any documentation to ensure consistency across the project! 🎯
