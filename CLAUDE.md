# 🧠 Claude Code Assistant - Padelyzer Project

## 🚨 CRITICAL RULES - NO DUPLICATES

### ⛔ NEVER CREATE DUPLICATE VERSIONS
**BEFORE creating any new component, page, or module:**

1. **CHECK EXISTING CODE FIRST**
   ```bash
   # For frontend components
   find frontend/src -name "*dashboard*" -type d
   find frontend/src -name "*ComponentName*"
   
   # For backend modules  
   ls backend/apps/
   ```

2. **USE EXISTING VERSIONS**
   - Dashboard: USE ONLY `dashboard-produccion/`
   - Login: USE ONLY `login-simple/`
   - Clubs: USE ONLY `clubs/`
   - DO NOT create: dashboard-v2, dashboard-new, dashboard-test, etc.

3. **IF CHANGES NEEDED**
   - MODIFY existing files
   - NEVER create alternative versions
   - Use feature flags for variations, not new folders

### 🔒 Component Creation Lock
```javascript
// BEFORE creating any component:
const ALLOWED_PATHS = {
  dashboard: 'app/[locale]/dashboard-produccion',
  components: 'components/shared',
  clubs: 'app/[locale]/clubs',
  reservations: 'app/[locale]/reservations'
}

// FORBIDDEN patterns:
// ❌ dashboard-*
// ❌ *-test
// ❌ *-new
// ❌ *-v2
// ❌ *-backup
// ❌ *-old
```

## 📋 Project Overview
Padelyzer is a complete ecosystem for padel clubs (B2B SaaS) and players (B2C Mobile App).

## 🔗 Notion Source of Truth
**IMPORTANT**: All requirements, flows, and specifications are documented in Notion.
- **Project URL**: https://www.notion.so/PRD-Padelyzer-24b8b429a81680a98408ce11c25d7118
- **Always check Notion FIRST** before implementing any feature
- **Update Notion** after completing any task

## 🏗️ Project Structure
```
/Users/ja/PZR4/
├── backend/          # Django REST API
├── frontend/         # Next.js 14 Web App
├── mobile/          # Expo React Native (pending)
├── docs/            # Local documentation
└── scripts/         # Automation scripts
```

## ✅ APPROVED Component Locations

### Frontend Structure (DO NOT DEVIATE)
```
frontend/src/
├── app/
│   ├── [locale]/
│   │   ├── dashboard-produccion/  ✅ USE THIS
│   │   ├── clubs/                 ✅ USE THIS
│   │   ├── reservations/          ✅ USE THIS
│   │   ├── login-simple/          ✅ USE THIS
│   │   └── [NEW FEATURES HERE]    ✅ ADD NEW HERE
├── components/
│   ├── ui/         # shadcn components only
│   ├── shared/     # Reusable components
│   └── [module]/   # Module-specific components
```

### Backend Structure (DO NOT DEVIATE)
```
backend/apps/
├── authentication/  ✅ EXISTS - DO NOT DUPLICATE
├── clubs/          ✅ EXISTS - DO NOT DUPLICATE
├── reservations/   ✅ EXISTS - DO NOT DUPLICATE
├── finance/        ✅ EXISTS - DO NOT DUPLICATE
├── classes/        ✅ EXISTS - IMPLEMENT HERE
├── tournaments/    ✅ EXISTS - IMPLEMENT HERE
└── [NEW MODULES]   ✅ CREATE NEW ONES HERE
```

## 🎯 Current Sprint Focus
**Sprint Goal**: Complete MVP for August 2025 Launch
**Priority**: Reservations + Payments Flow

### High Priority Tasks 🔴
1. Complete Stripe integration (webhooks) - IN `finance` module
2. ~~Unify frontend versions~~ USE `dashboard-produccion` ONLY
3. Implement notification system - IN `notifications` module
4. Complete E2E testing - IN existing test files

### Check Notion for:
- [ ] Latest requirements
- [ ] User flows
- [ ] API specifications
- [ ] UI/UX designs
- [ ] Test cases

## 🤖 Available AI Agents

### 1. Code Generator Agent
**Use for**: Creating new components, models, or features
```bash
# Example prompt:
"Generate a Django model for Classes module based on Notion requirements"
# IMPORTANT: Always specify WHERE to create it
```

### 2. Refactoring Agent
**Use for**: Improving existing code
```bash
# Example prompt:
"Refactor the reservations view to fix N+1 queries"
# NEVER: "Create a new optimized version"
# ALWAYS: "Modify the existing file"
```

### 3. Testing Agent
**Use for**: Writing tests
```bash
# Example prompt:
"Create comprehensive tests for Stripe webhook handlers"
# Add to existing test files, don't create new test folders
```

### 4. Documentation Agent
**Use for**: Updating docs
```bash
# Example prompt:
"Document the API endpoints for Classes module"
# Update existing docs, don't create duplicate documentation
```

### 5. Bug Fixing Agent
**Use for**: Debugging issues
```bash
# Example prompt:
"Debug why reservations are not showing in dashboard-produccion"
# Fix in the production version, not a test version
```

## 📚 Key Documents in Notion

### Requirements & Specs
- **Features Database**: All features with status, priority, and specs
- **User Flows**: Detailed user journeys for each module
- **API Specifications**: Endpoint documentation
- **Data Models**: Database schema and relationships

### Development
- **Sprint Planning**: Current sprint tasks and goals
- **Bug Tracker**: Known issues and fixes
- **Tech Decisions**: Architecture decisions and rationale
- **Code Standards**: Coding conventions and best practices

## 🔄 Workflow

### Before Starting Any Task:
1. **Check existing code** for similar implementations
2. **Verify no duplicates** exist
3. **Check Notion** for requirements
4. **Read related flows** in User Flows page
5. **Review API specs** if backend work

### During Development:
1. **Follow patterns** already established
2. **Modify existing files** when possible
3. **Write tests** as you code
4. **Document changes** in code comments
5. **Update types** if TypeScript

### After Completing Task:
1. **Update Notion** with progress
2. **Run tests** to ensure nothing broke
3. **Update API docs** if endpoints changed
4. **Create PR** with clear description
5. **Delete any test/temporary files**

## 🛠️ Quick Commands

### Backend
```bash
cd backend
source venv/bin/activate
python manage.py runserver

# Run tests
python manage.py test apps.{module_name}

# Create migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### Frontend
```bash
cd frontend
npm run dev

# Type check
npm run type-check

# Build
npm run build

# Test
npm test
```

### Cleanup Duplicates
```bash
# List duplicate dashboards (DO NOT USE THESE)
ls -la frontend/src/app/ | grep dashboard
# Should only keep dashboard-produccion

# Remove test components
find frontend/src -name "*-test" -type d
find frontend/src -name "*-backup*" -type d
```

## 📊 Context Optimization

### When asking Claude for help, always provide:
1. **Module context**: "Working on Classes module"
2. **File location**: "Modify existing file at apps/classes/views.py"
3. **Notion reference**: "According to Notion doc X..."
4. **Current state**: "Feature is 70% complete"
5. **Specific goal**: "Need to add payment processing to existing code"

### Example Perfect Prompt:
```
"I'm working on the Classes module (backend/apps/classes/).
According to Notion, we need to support recurring classes with
multiple instructors. Currently, the models are created but
views are missing. Please CREATE the ViewSets in the EXISTING
apps/classes/views.py file following our existing pattern in
the reservations module. Must integrate with our Stripe
subscription system. DO NOT create a new classes-v2 or
classes-test module."
```

## 🚨 Critical Information

### Environment Variables
Check `.env.example` for required variables

### Database
- Development: SQLite
- Production: PostgreSQL
- Always use migrations, never modify DB directly

### Authentication
- JWT tokens via Simple JWT
- Token refresh every 24 hours
- Multi-tenant by club subdomain

### Payments
- Stripe Connect for clubs
- Webhooks must be idempotent
- Always log payment events

## 📈 Performance Guidelines

### Backend
- Use select_related() and prefetch_related()
- Paginate all list endpoints
- Cache expensive queries with Redis
- Use async views for long operations

### Frontend
- Lazy load components
- Optimize images with next/image
- Use React.memo for expensive components
- Implement proper loading states

## 🔐 Security Checklist

- [ ] Validate all inputs
- [ ] Use serializers for data validation
- [ ] Check permissions on every view
- [ ] Sanitize user-generated content
- [ ] Use HTTPS in production
- [ ] Keep dependencies updated
- [ ] No sensitive data in logs

## 📝 Documentation Standards

### Code Comments
```python
# TODO: Implement caching here (IN THIS FILE)
# FIXME: This query is slow with 1000+ records (FIX HERE)
# NOTE: This is a temporary workaround for issue #123
# HACK: Remove this after Stripe API v3 update
# NEVER: Do not create alternative version
```

### Commit Messages
```
feat: Add recurring classes support to existing module
fix: Resolve N+1 query in reservations list  
docs: Update API documentation for classes
test: Add integration tests for payments
refactor: Simplify authentication flow (in-place)
cleanup: Remove duplicate dashboard versions
```

## 🎨 UI/UX Patterns

### Follow existing patterns:
- Forms: Use react-hook-form + zod
- Tables: Use tanstack-table
- Modals: Use radix-ui/dialog
- Toasts: Use sonner
- Icons: Use lucide-react
- DO NOT install new UI libraries

## 📞 Getting Help

1. **First**: Check existing code for patterns
2. **Second**: Check Notion documentation
3. **Third**: Search existing code for examples
4. **Fourth**: Ask specific question with context
5. **Never**: Create a "quick test version" to try something

## 🔄 Daily Checklist

- [ ] Pull latest changes
- [ ] Check for duplicate components
- [ ] Remove any test files created yesterday
- [ ] Check Notion for updates
- [ ] Review assigned tasks
- [ ] Update task status
- [ ] Commit changes to EXISTING files
- [ ] Update documentation

## 🚀 Deployment

### Staging
```bash
git push origin feature-branch
# Auto-deploys to staging
# NO test branches like feature-branch-test-v2
```

### Production
```bash
git push origin main
# Requires approval
# Must pass duplicate checker
```

## ⛔ FORBIDDEN ACTIONS

The following will result in immediate rejection:

1. Creating `*-test`, `*-v2`, `*-new`, `*-backup` versions
2. Duplicating existing modules or components
3. Creating alternative implementations "to test"
4. Making copies instead of modifying
5. Creating new apps when one exists
6. Adding new UI libraries when we have shadcn
7. Creating new state management when we have Zustand
8. Making new API clients when we have one
9. Writing custom form validation when we have react-hook-form
10. Creating custom UI components when shadcn has them

---

**Remember**: 
- Notion is the source of truth
- NEVER create duplicates
- ALWAYS modify existing code
- When in doubt, ask WHERE to put code

**Project**: /Users/ja/PZR4
**Owner**: Jaime Alcázar (jaime@padelyzer.com)
