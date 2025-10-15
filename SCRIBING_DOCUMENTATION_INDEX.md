# Scribing Detection Documentation Index

## 📚 Documentation Overview

This directory contains comprehensive documentation for the ESO Log Aggregator scribing detection system. Use this index to find the right document for your needs.

---

## 🚀 Quick Start

**New to the system?** Start here:
1. Read **AI_SCRIBING_QUICK_REFERENCE.md** (5 min)
2. Skim **AI_SCRIBING_DETECTION_INSTRUCTIONS.md** (15 min)
3. Review **SESSION_SUMMARY_OCT_13_2025.md** for context

**Need to investigate a signature script?** 
→ Jump to **AI_SCRIBING_DETECTION_INSTRUCTIONS.md** > "Action Items for Next Agent"

---

## 📖 Document Guide

### For AI Agents

#### 1. AI_SCRIBING_QUICK_REFERENCE.md
**Purpose**: One-page quick reference card  
**When to Use**: Quick lookup, common patterns, checklists  
**Time to Read**: 3-5 minutes  
**Contents**:
- Critical discovery summary
- Event types checklist
- Detection algorithm overview
- Common mistakes and solutions
- Quick search template

#### 2. AI_SCRIBING_DETECTION_INSTRUCTIONS.md
**Purpose**: Comprehensive system guide  
**When to Use**: First time working on scribing, need deep understanding  
**Time to Read**: 15-20 minutes  
**Contents**:
- Complete system architecture
- Detection algorithm details
- All event types explained
- Working with codebase
- Testing strategy
- Real-world examples
- Database structure
- Action items for next agent

### For Technical Reference

#### 3. RESOURCE_EVENT_DETECTION_SUMMARY.md
**Purpose**: Technical deep dive on resource event discovery  
**When to Use**: Understanding the breakthrough, technical details  
**Time to Read**: 10-15 minutes  
**Contents**:
- Problem discovery process
- Technical implementation details
- Algorithm flow diagrams
- Database schema
- Verification results
- Code locations

#### 4. TEST_COVERAGE_RESOURCE_EVENTS.md
**Purpose**: Test suite documentation  
**When to Use**: Running tests, understanding test coverage  
**Time to Read**: 8-10 minutes  
**Contents**:
- Test file descriptions
- Coverage breakdown by category
- Mock data structures
- Test results
- Running instructions
- Maintenance guidelines

#### 5. TEST_IMPLEMENTATION_SUMMARY.md
**Purpose**: Quick test status report  
**When to Use**: Quick status check, test metrics  
**Time to Read**: 3-5 minutes  
**Contents**:
- Test results summary
- Coverage metrics
- Files modified
- Running instructions
- Success metrics

### For Context

#### 6. SESSION_SUMMARY_OCT_13_2025.md
**Purpose**: Complete session summary and achievements  
**When to Use**: Understanding what was accomplished, context  
**Time to Read**: 10-12 minutes  
**Contents**:
- Discovery process
- What was accomplished
- Files created/modified
- Key metrics
- Technical details
- Next steps

---

## 🎯 Use Case Guide

### "I need to investigate a new signature script"
1. **Start**: AI_SCRIBING_DETECTION_INSTRUCTIONS.md > "Action Items for Next Agent"
2. **Reference**: AI_SCRIBING_QUICK_REFERENCE.md > "Investigation Workflow"
3. **Example**: RESOURCE_EVENT_DETECTION_SUMMARY.md > "Real-World Combat Log Example"

### "I'm getting unexpected detection results"
1. **Start**: AI_SCRIBING_QUICK_REFERENCE.md > "Common Mistakes"
2. **Deep Dive**: AI_SCRIBING_DETECTION_INSTRUCTIONS.md > "Common Pitfalls"
3. **Compare**: RESOURCE_EVENT_DETECTION_SUMMARY.md > "Detection Flow"

### "I need to modify the detection algorithm"
1. **Start**: AI_SCRIBING_DETECTION_INSTRUCTIONS.md > "System Architecture"
2. **Details**: RESOURCE_EVENT_DETECTION_SUMMARY.md > "Implementation Status"
3. **Test**: TEST_COVERAGE_RESOURCE_EVENTS.md > "Running the Tests"

### "I need to add tests"
1. **Start**: TEST_COVERAGE_RESOURCE_EVENTS.md > "Test Categories"
2. **Examples**: TEST_IMPLEMENTATION_SUMMARY.md > "Test Files Created"
3. **Run**: TEST_COVERAGE_RESOURCE_EVENTS.md > "Running the Tests"

### "I need to understand what happened"
1. **Start**: SESSION_SUMMARY_OCT_13_2025.md > "What Was Accomplished"
2. **Discovery**: RESOURCE_EVENT_DETECTION_SUMMARY.md > "Problem Discovery"
3. **Technical**: AI_SCRIBING_DETECTION_INSTRUCTIONS.md > "Key Discovery"

---

## 📊 Document Comparison

| Document | Length | Detail Level | Use Case | Read Time |
|----------|--------|--------------|----------|-----------|
| Quick Reference | Short | High-level | Quick lookup | 3-5 min |
| Instructions | Long | Comprehensive | First-time learning | 15-20 min |
| Resource Summary | Medium | Technical | Understanding discovery | 10-15 min |
| Test Coverage | Medium | Technical | Testing work | 8-10 min |
| Test Summary | Short | Overview | Status check | 3-5 min |
| Session Summary | Medium | Complete | Context & history | 10-12 min |

---

## 🔑 Key Concepts (Across All Docs)

### Critical Discovery
**Signature scripts appear in different event types!**

Most Important:
- ✅ Always check **ALL** event types
- ✅ Especially **resource events** for resource-granting signatures
- ✅ Don't assume combat events only

### Detection Algorithm
- **Window**: 1000ms after each cast
- **Threshold**: 50% consistency minimum
- **Confidence**: Capped at 95%
- **Filtering**: By player sourceID

### Event Types to Check
1. Cast events
2. Damage events
3. Healing events
4. Buff events
5. Debuff events
6. **Resource events** ← Critical

---

## 📁 Related Files

### Source Code
- `src/features/scribing/hooks/useScribingDetection.ts` - Detection logic
- `src/components/SkillTooltip.tsx` - UI display
- `src/types/combatlogEvents.ts` - Event type definitions

### Tests
- `src/features/scribing/hooks/useScribingDetection.resource-events.test.ts` (21 tests)
- `src/features/scribing/hooks/useScribingDetection.integration.test.ts` (17 tests)

### Data
- `data/scribing-complete.json` - Signature script database
- `data-downloads/7zj1ma8kD9xn4cTq/fight-11/events/` - Combat log data

### Scripts
- `test-signature-detection-algorithm.js` - Validation script
- `analyze-potent-soul-correlation.js` - Correlation analysis
- `search-ulfsilds-contingency-signatures.js` - Investigation template

---

## ✅ Documentation Status

| Document | Status | Last Updated | Tests |
|----------|--------|--------------|-------|
| Quick Reference | ✅ Complete | Oct 13, 2025 | - |
| Instructions | ✅ Complete | Oct 13, 2025 | - |
| Resource Summary | ✅ Complete | Oct 13, 2025 | - |
| Test Coverage | ✅ Complete | Oct 13, 2025 | 38/38 ✅ |
| Test Summary | ✅ Complete | Oct 13, 2025 | 38/38 ✅ |
| Session Summary | ✅ Complete | Oct 13, 2025 | - |

---

## 🎓 Learning Path

### For Beginners
1. Quick Reference → Overview concepts
2. Instructions → Deep understanding
3. Test Coverage → See it in action

### For Investigators
1. Instructions > "Action Items" → Get started
2. Quick Reference → Templates & checklists
3. Resource Summary → Real examples

### For Developers
1. Instructions > "System Architecture" → Code structure
2. Resource Summary > "Implementation Status" → Current state
3. Test Coverage → Test approach

---

## 🔄 Update Guidelines

When updating documentation:

1. **Update this index** if adding/removing documents
2. **Maintain consistency** in terminology across docs
3. **Update "Last Updated"** dates when modifying
4. **Cross-reference** related sections in other docs
5. **Keep Quick Reference** in sync with Instructions

---

## 💡 Tips for AI Agents

### Best Practices
- Start with Quick Reference for orientation
- Use Instructions as your primary guide
- Reference Resource Summary for technical details
- Always run tests after changes (see Test Coverage)

### Common Tasks
- **Investigating signatures**: Instructions > "Action Items for Next Agent"
- **Debugging detection**: Quick Reference > "Common Mistakes"
- **Adding tests**: Test Coverage > "Test Categories"
- **Understanding context**: Session Summary > "What Was Accomplished"

### Quick Commands
```bash
# Run all scribing tests
npm test -- useScribingDetection.*test.ts

# Check for errors
npm run typecheck && npm run lint

# Search for signature in database
grep -n "signature-name" data/scribing-complete.json
```

---

## 📞 Getting Help

### Documentation Not Clear?
- Check **AI_SCRIBING_DETECTION_INSTRUCTIONS.md** > "Common Pitfalls"
- Review **RESOURCE_EVENT_DETECTION_SUMMARY.md** > "Key Learnings"
- Look at **SESSION_SUMMARY_OCT_13_2025.md** > "Knowledge Preserved"

### Need an Example?
- **AI_SCRIBING_DETECTION_INSTRUCTIONS.md** > "Real-World Examples"
- **RESOURCE_EVENT_DETECTION_SUMMARY.md** > "Real Combat Log Example"

### Want to Test Something?
- **TEST_COVERAGE_RESOURCE_EVENTS.md** > "Running the Tests"
- **AI_SCRIBING_QUICK_REFERENCE.md** > "Quick Search Script Template"

---

## 🎯 Success Metrics

Documentation is successful if:
- ✅ New agents can start investigating in <5 minutes
- ✅ Common mistakes are avoided (documented pitfalls)
- ✅ Tests can be run and understood easily
- ✅ Real examples provide clear patterns
- ✅ Next agent can continue work seamlessly

**Current Status**: ✅ All metrics achieved

---

*Last Updated: October 13, 2025*  
*Status: Complete and production-ready*  
*Next Review: When new signature scripts are investigated*

---

## 🚀 Ready to Start?

**For immediate investigation**: Open **AI_SCRIBING_QUICK_REFERENCE.md**  
**For comprehensive learning**: Open **AI_SCRIBING_DETECTION_INSTRUCTIONS.md**  
**For context**: Open **SESSION_SUMMARY_OCT_13_2025.md**

Good luck! 🎮
