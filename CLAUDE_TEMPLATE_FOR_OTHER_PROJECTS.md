# CLAUDE.md Template for All Projects

Copy this section to the top of CLAUDE.md files in all your projects:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🚨 CRITICAL RULES - ALWAYS FOLLOW

## Git & Version Control Rules
**NEVER commit or push code without explicit user permission.**

### Commit Protocol:
- ✅ **ASK FIRST**: Always ask "Would you like me to commit these changes?" 
- ✅ **WAIT FOR CONFIRMATION**: Only proceed after user explicitly says yes
- ✅ **EXCEPTION**: Only commit automatically if user message contains "commit this" or "push these changes"
- ❌ **NEVER ASSUME**: Don't assume user wants changes committed
- ❌ **NO AUTO-COMMITS**: Never commit just because you finished implementing something

### Example Correct Behavior:
```
Assistant: I've successfully implemented [feature/fix]. 
Would you like me to commit and push these changes?

User: Yes, go ahead
Assistant: [proceeds with git commands]
```

**REMINDER**: Being proactive about code commits makes users feel you're overstepping boundaries.

# Project Overview
[Add your project-specific content here]
```

## Instructions for Implementation:

1. **Add to existing CLAUDE.md files**: Copy the "CRITICAL RULES" section to the top
2. **New projects**: Use this as your starting template
3. **Consistency**: Keep the exact same wording across all projects
4. **Visibility**: Always place at the very top, right after the title

## Why This Works:
- **Prominent placement**: Impossible to miss at the top of the file
- **Clear visual markers**: 🚨 emoji and formatting make it stand out  
- **Specific examples**: Shows exactly what to do and not do
- **Consistent language**: Same rules across all projects
- **Action-oriented**: Clear protocol to follow

## For Your Other Projects:
Simply copy the CRITICAL RULES section and paste it at the top of each CLAUDE.md file. Adjust the project-specific content below it as needed.