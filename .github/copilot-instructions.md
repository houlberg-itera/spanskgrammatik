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

## Project Status: ✅ COMPLETE WITH AI ENHANCEMENTS

All major components have been implemented and enhanced with comprehensive AI-powered exercise generation:

### ✅ Authentication System
- User registration and login with Supabase Auth
- Secure authentication flow with middleware protection
- User profile creation and management

### ✅ Database Schema
- Comprehensive PostgreSQL schema with RLS policies
- User progress tracking and level management
- Exercise and topic organization by language levels
- JSONB content structure for flexible exercise data

### ✅ Level Progression System
- A1, A2, B1 language levels with locked progression
- 80% completion requirement to unlock next level
- Visual progress tracking and statistics

### ✅ Exercise System
- Multiple question types (multiple choice, fill-in-blank, translation, conjugation)
- Interactive exercise player with immediate feedback
- Score calculation and progress saving
- JSONB content structure with embedded difficulty and AI metadata

### ✅ AI Integration - ENHANCED
- OpenAI GPT-4 integration for advanced exercise generation
- Sophisticated prompt engineering with difficulty targeting
- Danish-language instructions and explanations
- Contextual feedback for student answers
- Bulk exercise generation with quality validation
- Proficiency-targeted content creation

### ✅ User Interface
- Modern, responsive design with Tailwind CSS
- Danish language interface throughout
- Dashboard with level overview and progress tracking
- Individual exercise and topic pages

### ✅ Sample Content
- Complete database schema with sample exercises
- Pre-built exercises for A1, A2, and B1 levels
- Grammar topics covering essential Spanish concepts

### ✅ NEW: Comprehensive Admin System
- **Admin Dashboard**: Real-time overview of user proficiency and exercise needs
- **AI Exercise Generator**: Bulk generation interface with advanced controls
- **Content Management**: Full CRUD operations for topics and exercises
- **Proficiency Analysis**: Individual user performance analytics
- **Advanced AI Prompting**: Sophisticated exercise generation with quality control

### ✅ NEW: Enhanced Features
- **Proficiency Assessment**: Comprehensive algorithms for skill evaluation
- **Adaptive Recommendations**: Personalized study plans based on performance
- **Quality Validation**: AI-powered exercise quality scoring
- **Difficulty Distribution**: Smart exercise distribution across difficulty levels
- **Performance Analytics**: Detailed insights into student strengths and weaknesses

## Next Steps for Enhanced Deployment:

1. **Set up environment variables**:
   - Ensure .env.local has OpenAI API key for enhanced AI features
   - Verify Supabase credentials for admin functionality
   - Test AI exercise generation endpoints

2. **Database compatibility**:
   - Verify database schema matches current structure with JSONB content
   - Ensure RLS policies support admin operations
   - Test AI exercise generation with current schema

3. **Deploy enhanced application**:
   - Connect GitHub repository to Vercel
   - Add all environment variables to Vercel dashboard
   - Deploy the enhanced application with AI features

4. **Test enhanced system**:
   - Access admin dashboard at /admin/dashboard
   - Test bulk AI exercise generation at /admin/exercise-generator
   - Verify proficiency analysis at /admin/proficiency-analysis
   - Test content management at /admin/content-management

5. **Monitor AI performance**:
   - Track exercise generation quality and user engagement
   - Monitor OpenAI API usage and costs
   - Collect feedback on AI-generated content accuracy

The application now includes a comprehensive AI-powered exercise generation system that addresses the original requirement: "5 test in each subject is not enough to determine if the student is profient in a level." The new system can generate unlimited high-quality exercises with adaptive difficulty and proficiency targeting!