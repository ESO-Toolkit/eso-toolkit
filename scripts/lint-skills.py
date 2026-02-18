#!/usr/bin/env python3
"""
Validate all SKILL.md files in .github/skills/ against the agentskills.io spec.

Usage:
  pip install skills-ref
  python scripts/lint-skills.py

Exit code 0 = all skills valid. Non-zero = one or more failures.
"""

import sys
from pathlib import Path

try:
    from skills_ref import validate
except ImportError:
    print("Error: skills-ref is not installed. Run: pip install skills-ref")
    sys.exit(1)

SKILLS_DIR = Path(__file__).parent.parent / ".github" / "skills"

if not SKILLS_DIR.exists():
    print(f"Error: skills directory not found at {SKILLS_DIR}")
    sys.exit(1)

skill_dirs = sorted(d for d in SKILLS_DIR.iterdir() if d.is_dir())
failed = []

for skill_dir in skill_dirs:
    problems = validate(skill_dir)
    if problems:
        failed.append(skill_dir.name)
        print(f"❌ {skill_dir.name}")
        for problem in problems:
            print(f"   {problem}")
    else:
        print(f"✅ {skill_dir.name}")

print()
if failed:
    print(f"FAILED: {len(failed)}/{len(skill_dirs)} skill(s) invalid: {', '.join(failed)}")
    sys.exit(1)
else:
    print(f"All {len(skill_dirs)} skills passed validation.")
