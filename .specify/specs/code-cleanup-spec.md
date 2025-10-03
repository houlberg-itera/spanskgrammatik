# Code Cleanup Specification

**Status**: Draft  
**Priority**: High  
**Complexity**: Low  
**Type**: Maintenance  

## Overview

Systematic cleanup of debug files, test utilities, and unused code from the Spanskgrammatik codebase to maintain code quality and reduce repository bloat.

## Constitution Check

✅ **Enhancement-First Approach**: Removes clutter without affecting functional code  
✅ **Testing-Driven Quality**: Preserves essential debugging capabilities  
✅ **AI-Enhanced Personalization**: No impact on AI features  
✅ **Modular Enhancement Architecture**: Maintains clean component structure  
✅ **Performance & Reliability Optimization**: Reduces build overhead  

## Requirements

### Must Have
- **MH-1**: Remove all root-level debug scripts (debug-*.js files)
- **MH-2**: Remove all root-level test utilities (test-*.js, clear-*.js files)
- **MH-3**: Clean up temporary API test endpoints (/api/*test*, /api/*debug*)
- **MH-4**: Remove temporary page components (/test*, /debug-*)
- **MH-5**: Preserve admin debug capabilities and essential testing infrastructure

### Should Have
- **SH-1**: Update documentation to reflect cleanup changes
- **SH-2**: Add .gitignore entries to prevent future debug file commits
- **SH-3**: Create development guidelines for temporary file naming

### Could Have
- **CH-1**: Archive removed files in a separate branch for future reference
- **CH-2**: Create cleanup automation scripts

## Technical Approach

### Files Identified for Removal

#### Root Directory Cleanup
```
debug-progress-saving.js          # Temporary debugging script
debug-progress-structure.js       # Temporary debugging script  
debug-specific-topic.mjs          # Temporary debugging script
debug-topic-exercise.js           # Temporary debugging script
debug-topic-exercises.js          # Temporary debugging script
test-auth.js                      # Temporary test script
clear-user-progress.js            # Temporary utility script
fix-new-user-progress.sql         # Temporary SQL fix
fix-rpc-function.sql             # Temporary SQL fix
fix-user-progress-schema.sql      # Temporary SQL fix
```

#### API Endpoints Cleanup
```
# Remove these temporary endpoints (no dependencies found):
src/app/api/test-auth/
src/app/api/test-comprehensive/ 
src/app/api/test-connection/
src/app/api/test-direct-save/
src/app/api/test-exercise-completion/
src/app/api/test-final/
src/app/api/test-module-fix/
src/app/api/test-supabase-auth/
src/app/api/debug-ai-configs/
src/app/api/debug-retry-mode/
src/app/api/debug-user-state/
```

#### Page Components Cleanup
```
src/app/test/                     # Temporary test pages
src/app/test-answers/             # Temporary test pages
src/app/debug-resume/             # Temporary debug pages
```

#### Preserved Components (Dependencies Found)
```
src/app/admin/debug/              # Keep - essential admin functionality
src/app/admin/test/               # Keep - essential admin functionality
src/app/api/debug-database/       # Keep - used by ProgressErrorHandler
src/app/api/test-progress/        # Keep - used by ProgressErrorHandler
```

### Safety Measures
1. **Git Backup**: Create feature branch before cleanup
2. **Dependency Check**: Verify no imports reference removed files
3. **Build Verification**: Ensure application builds after cleanup
4. **Functional Testing**: Verify core functionality remains intact

## Implementation Plan

### Phase 1: Preparation
1. Create cleanup branch: `cleanup/remove-debug-test-files`
2. Document current file structure
3. Run dependency analysis to check for imports

### Phase 2: Safe Removal
1. Remove root-level debug/test files
2. Remove temporary API endpoints  
3. Remove temporary page components
4. Update any remaining references

### Phase 3: Verification
1. Build application successfully
2. Run basic functionality tests
3. Verify admin capabilities preserved
4. Update documentation

## Acceptance Criteria

✅ **AC-1**: All temporary debug/test files removed from repository  
✅ **AC-2**: Application builds and runs without errors  
✅ **AC-3**: Core functionality (auth, exercises, progress) works correctly  
✅ **AC-4**: Admin debug capabilities preserved  
✅ **AC-5**: No broken imports or references remain  
✅ **AC-6**: Repository size reduced by cleanup  

## Risk Assessment

**Low Risk**: Files identified are temporary debugging utilities with no production dependencies

**Mitigation**: Git history preserves all removed files for recovery if needed

## Dependencies

- Git branch management for safe cleanup
- Build system verification  
- Basic functional testing capabilities

## Execution Summary

This specification identifies **24 files/directories** for safe removal:

### Safe to Remove (24 items):
- **10 root directory files**: debug scripts, test scripts, temporary SQL fixes
- **11 API endpoints**: temporary test/debug routes with no dependencies  
- **3 page directories**: temporary test/debug pages

### Preserved (4 items):
- **2 admin directories**: Essential admin functionality
- **2 API endpoints**: Used by active ProgressErrorHandler component

### Expected Impact:
- **Disk space**: Approximately 50-100KB reduction
- **Maintenance**: Reduced cognitive overhead from temporary files
- **Performance**: No impact (files not loaded in production)
- **Functionality**: Zero impact (all preserved files have active dependencies)

The cleanup follows constitutional guidelines for systematic enhancement while preserving all functional components.

**Created**: 2025-09-26  
**Last Updated**: 2025-09-26  
**Version**: 1.0.0