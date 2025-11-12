<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## GitHub MCP Server Instructions
- **ALWAYS use GitHub MCP server tools when available** for all repository operations including:
  - Creating, updating, and managing files via `mcp_github_create_or_update_file`
  - Pushing multiple files with `mcp_github_push_files`
  - Managing pull requests, issues, and repository settings
  - Resolving merge conflicts and managing branches
  - Any Git operations that can be performed through the GitHub API
- Prefer GitHub MCP tools over local file operations when working with repository content
- Use GitHub MCP for synchronization between local and remote repository states

## Git Workflow Guidelines
- **NEVER commit and push single files to GitHub** - this creates unnecessary noise in commit history
- **Work locally until explicitly asked to commit/push** - make all changes locally first
- **Batch related changes together** in meaningful commits with descriptive messages
- **Only commit and push when requested by the user** or when a logical set of changes is complete
- **Test changes locally** before committing to ensure they work properly
- Use meaningful commit messages that describe the actual changes made

## Testing Guidelines
- **USER HANDLES ALL TESTING** - Do not run test commands or verification scripts
- **FOCUS ON CODE IMPLEMENTATION** - Implement requested changes and fixes
- **NO AUTOMATED TESTING** - User will test all functionality manually
- **PROVIDE IMPLEMENTATION ONLY** - Deliver working code without testing procedures

## Project Checklist
- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements

- [x] Scaffold the Project

- [x] Customize the Project

- [x] Install Required Extensions

- [x] Compile the Project

- [x] Create and Run Task

- [x] Launch the Project

- [x] Ensure Documentation is Complete

## Project Specification
Spanish Learning App for Danish Speakers
- Next.js 15 with App Router and TypeScript
- Supabase for database, authentication, and real-time features
- OpenAI API for AI-powered grammar exercises
- Tailwind CSS for styling
- Level-based progression system (A1, A2, B1)
- User registration and authentication
- Progress tracking with level gating
- Danish language UI support
- Deployment on Vercel with GitHub integration
