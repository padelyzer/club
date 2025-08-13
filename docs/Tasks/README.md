# 📋 Task Management System

> Central hub for all development tasks across Padelyzer sprints

## 📊 Task Overview

### Current Active Tasks

```tasks
not done
path includes Tasks/
sort by priority
group by file
```

### Recently Completed

```tasks
done
done after 2025-01-01
path includes Tasks/
limit 10
```

## 🎯 Task Categories

### 🏗️ Infrastructure Tasks
- **Location**: `Tasks/Infrastructure/`
- **Agent**: general-purpose
- **Examples**: Database optimization, deployment, monitoring

### 🖥️ Frontend Tasks  
- **Location**: `Tasks/Frontend/`
- **Agent**: padelyzer-frontend-orchestrator
- **Examples**: UI components, mobile optimization, PWA features

### 🏢 Clubs Management
- **Location**: `Tasks/Clubs/`
- **Agent**: courts-module-specialist
- **Examples**: Court management, club profiles, reservations

### 👥 Client Management
- **Location**: `Tasks/Clients/`
- **Agent**: clients-module-specialist
- **Examples**: Player profiles, partner matching, user management

### 📚 Classes & Training
- **Location**: `Tasks/Classes/`
- **Agent**: classes-module-specialist
- **Examples**: Class scheduling, instructor management, student enrollment

## 🤖 Agent Assignment Rules

### Task Assignment Matrix

| Task Type | Primary Agent | Secondary Agent |
|-----------|---------------|-----------------|
| Infrastructure | general-purpose | - |
| Frontend/UI | padelyzer-frontend-orchestrator | general-purpose |
| Clubs/Courts | courts-module-specialist | general-purpose |
| Clients/Players | clients-module-specialist | general-purpose |
| Classes/Training | classes-module-specialist | general-purpose |
| Analytics/BI | general-purpose | - |
| Security | general-purpose | - |

## 📝 Task Creation Guidelines

### Task Template Structure
```markdown
# Task: [Task Name]

## 📋 Overview
- **Sprint**: [Sprint Number]
- **Agent**: [Assigned Agent]
- **Priority**: 🔴 High / 🟡 Medium / 🟢 Low
- **Status**: ⬜ Not Started / 🔄 In Progress / ✅ Complete
- **Estimated Hours**: [Hours]

## 🎯 Description
[Detailed task description]

## ✅ Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## 🔧 Technical Requirements
- [ ] Technical requirement 1
- [ ] Technical requirement 2

## 🧪 Tests Required
- [ ] Test file 1
- [ ] Test file 2

## 📁 Files to Modify
- `path/to/file1.py`
- `path/to/file2.tsx`

## 🔗 Dependencies
- [[Task Name 1]]
- [[Task Name 2]]

## 📈 Progress
- [x] Task started
- [ ] Implementation phase
- [ ] Testing phase  
- [ ] Code review
- [ ] Deployment

## 📝 Notes
[Any additional notes or considerations]
```

## 🔄 Task Workflow

### 1. Task Creation
1. Use task template
2. Assign to appropriate agent
3. Link to related tasks
4. Add to Sprint board

### 2. Task Execution
1. Agent picks up task
2. Updates status to "In Progress"
3. Regular progress updates
4. Creates subtasks if needed

### 3. Task Completion
1. All acceptance criteria met
2. Tests written and passing
3. Code reviewed
4. Status updated to "Complete"
5. Sprint board updated

## 📊 Task Tracking

### Status Indicators
- ⬜ **Not Started**: Task is ready but not begun
- 🔄 **In Progress**: Currently being worked on
- ⏸️ **Blocked**: Waiting for dependencies
- ✅ **Complete**: All criteria met and tested
- ❌ **Cancelled**: No longer needed

### Priority Levels
- 🔴 **High**: Critical path, blocks other tasks
- 🟡 **Medium**: Important but not blocking
- 🟢 **Low**: Nice to have, can be deferred

### Time Tracking
- Log actual hours spent
- Compare to estimates
- Update estimates for similar future tasks

## 🧪 Task Testing Requirements

### Required Tests by Task Type
- **Backend**: Unit tests, integration tests
- **Frontend**: Component tests, E2E tests
- **Infrastructure**: Deployment tests, monitoring tests
- **Security**: Security tests, audit tests

### Test Coverage Targets
- Unit tests: >90%
- Integration tests: Critical paths covered
- E2E tests: All user workflows
- Performance tests: Load and stress tests

## 📈 Metrics & Reporting

### Task Metrics
```tasks
not done
path includes Tasks/
group by status
```

### Velocity Tracking
- Tasks completed per sprint
- Average task completion time
- Accuracy of time estimates

### Agent Workload
```tasks
not done
path includes Tasks/
group by description contains "Agent:"
```

## 🔍 Quick Filters

### By Sprint
```tasks
description includes "Sprint 16"
path includes Tasks/
```

### By Priority
```tasks
description includes "🔴 High"
path includes Tasks/
sort by due
```

### By Agent
```tasks
description includes "general-purpose"
path includes Tasks/
```

## 🛠️ Task Management Tools

### Creating New Tasks
1. Copy template from `Templates/task-template.md`
2. Fill in all required fields
3. Save in appropriate category folder
4. Link from Sprint documentation

### Updating Tasks
1. Update progress checkboxes
2. Log time spent
3. Note any blockers
4. Update Sprint Dashboard

### Completing Tasks
1. Mark all criteria as complete
2. Run required tests
3. Update documentation
4. Archive or file appropriately

---

*Task system managed through Obsidian Tasks plugin*
*Auto-generates task queries and tracking*