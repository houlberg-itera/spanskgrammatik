# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
[Describe the main user journey in plain language]

### Acceptance Criteria

*Constitutional Compliance Checks:*
- [ ] **Learner-Centered Design**: Feature prioritizes user experience and accessibility
- [ ] **Educational Excellence**: Content and interactions support effective learning outcomes
- [ ] **AI-Powered Personalization**: Incorporates adaptive elements where applicable
- [ ] **Component-Based Architecture**: Implementation uses reusable, maintainable components
- [ ] **Performance-First Engineering**: Meets speed and efficiency requirements

*Functional Verification:*
- [ ] **Given** [precondition], **When** [action], **Then** [expected outcome]
- [ ] **Given** [another scenario], **When** [action], **Then** [expected outcome]  
- [ ] **Given** [edge case], **When** [action], **Then** [expected outcome]

*Technical Quality Gates:*
- [ ] Code passes TypeScript compilation without errors
- [ ] All tests pass (unit, integration, e2e as applicable)
- [ ] Performance benchmarks met (< 3s page loads, < 500ms API responses)
- [ ] Security requirements satisfied (authentication, authorization, data protection)
- [ ] Accessibility standards met (WCAG 2.1 AA minimum)

*Educational Quality Gates (if applicable):*
- [ ] Content accuracy validated by language learning experts
- [ ] CEFR level alignment verified
- [ ] User testing shows positive learning outcomes
- [ ] AI personalization effectiveness measured and validated

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]  
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Education-specific requirements (if applicable):*
- **FR-EDU-001**: Learning content MUST align with CEFR levels (A1, A2, B1)
- **FR-EDU-002**: Exercise generation MUST leverage AI for personalization
- **FR-EDU-003**: Progress tracking MUST adapt to individual learner performance

*Performance requirements (mandatory):*
- **FR-PERF-001**: Page load time MUST be < 3 seconds on 3G connections
- **FR-PERF-002**: API responses MUST be < 500ms (exercises) or < 2s (AI generation)

*Example of marking unclear requirements:*
- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*
- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
