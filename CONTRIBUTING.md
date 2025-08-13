# Contributing to Padelyzer

Thank you for your interest in contributing to Padelyzer! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- PostgreSQL 15+
- Git
- Basic knowledge of Django, Next.js, and TypeScript

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/pzr4.git
   cd pzr4
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements/base.txt
   cp .env.example .env
   python manage.py migrate
   python manage.py runserver
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

## 📋 How to Contribute

### 1. Issues

- **Bug Reports**: Use the bug report template and include steps to reproduce
- **Feature Requests**: Use the feature request template and explain the use case
- **Questions**: Use GitHub Discussions for general questions

### 2. Pull Requests

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow our coding standards (see below)
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   # Backend tests
   cd backend && python manage.py test
   
   # Frontend tests
   cd frontend && npm run test && npm run test:e2e
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Coding Standards

### Backend (Django/Python)

- Follow PEP 8 style guide
- Use type hints where possible
- Write docstrings for all functions and classes
- Use Django's built-in tools and conventions
- Keep views thin, models fat
- Use serializers for API responses

**Example:**
```python
from typing import Optional
from django.db import models

class Client(models.Model):
    """Client model for padel club management."""
    
    name: str = models.CharField(max_length=255)
    email: str = models.EmailField(unique=True)
    
    def __str__(self) -> str:
        return self.name
    
    def get_skill_level(self) -> Optional[str]:
        """Return the client's current skill level."""
        # Implementation here
        pass
```

### Frontend (Next.js/TypeScript)

- Use TypeScript for all files
- Use functional components with hooks
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Implement proper error handling
- Use Zustand for state management

**Example:**
```typescript
interface ClientProps {
  client: Client;
  onUpdate: (client: Client) => void;
}

export function ClientCard({ client, onUpdate }: ClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await updateClient(client);
      onUpdate(client);
    } catch (error) {
      console.error('Failed to update client:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg">
      {/* Component implementation */}
    </div>
  );
}
```

### Git Commit Messages

Use conventional commits format:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

**Examples:**
```
feat: add partner matching system
fix: resolve authentication token expiry issue
docs: update API documentation for reservations
style: format client components with prettier
refactor: optimize database queries for analytics
test: add unit tests for tournament bracket generation
chore: update dependencies to latest versions
```

## 🧪 Testing Guidelines

### Backend Testing

- Write unit tests for all models and services
- Use Django's TestCase for database tests
- Mock external services (Stripe, email, etc.)
- Test API endpoints with status codes and responses
- Aim for >90% test coverage

### Frontend Testing

- Use Jest for unit tests
- Use Playwright for E2E tests
- Test user interactions and edge cases
- Mock API calls in component tests
- Test accessibility features

### Integration Testing

- Test full user workflows
- Verify frontend-backend communication
- Test payment processing flows
- Validate real-time features (WebSocket)

## 📚 Documentation

- Update README.md for new features
- Add inline code comments for complex logic
- Update API documentation (OpenAPI/Swagger)
- Include example usage in docstrings
- Document breaking changes in CHANGELOG.md

## 🏗️ Architecture Guidelines

### Backend Architecture

- Use Django apps for feature separation
- Implement service layer for business logic
- Use serializers for API validation
- Follow RESTful API conventions
- Implement proper error handling
- Use database transactions appropriately

### Frontend Architecture

- Organize components by feature
- Use custom hooks for business logic
- Implement proper loading and error states
- Follow accessibility best practices
- Use proper TypeScript types
- Implement responsive design

### Database Design

- Use proper foreign key relationships
- Add database indexes for performance
- Use migrations for schema changes
- Document complex queries
- Consider data privacy requirements

## 🔐 Security Guidelines

- Never commit secrets or credentials
- Use environment variables for configuration
- Implement proper input validation
- Follow OWASP security guidelines
- Use HTTPS in production
- Implement rate limiting
- Log security events

## 🚀 Performance Guidelines

- Optimize database queries
- Use caching appropriately
- Implement pagination for large datasets
- Optimize bundle size (frontend)
- Use lazy loading where appropriate
- Monitor performance metrics

## 📱 Mobile & Accessibility

- Ensure responsive design
- Test on various screen sizes
- Implement proper ARIA labels
- Support keyboard navigation
- Test with screen readers
- Follow WCAG 2.1 guidelines

## 🤝 Code Review Process

### For Contributors

- Ensure your code follows our standards
- Write clear PR descriptions
- Respond to reviewer feedback promptly
- Update your branch with main before merging

### For Reviewers

- Be constructive and helpful
- Check functionality and code quality
- Verify tests pass and coverage is maintained
- Consider security and performance implications
- Approve only when ready for production

## 🎯 Feature Development Process

1. **Discuss** - Create an issue to discuss the feature
2. **Design** - Plan the implementation approach
3. **Implement** - Write code following our standards
4. **Test** - Add comprehensive tests
5. **Document** - Update relevant documentation
6. **Review** - Submit PR for code review
7. **Deploy** - Merge after approval

## 📊 Project Priorities

### High Priority
- Bug fixes and security issues
- Performance improvements
- Mobile responsiveness
- Accessibility improvements

### Medium Priority
- New features for core functionality
- Integration improvements
- Developer experience enhancements

### Low Priority
- Nice-to-have features
- Code refactoring (unless blocking)
- Experimental features

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor appreciation

## ❓ Questions?

- Create a GitHub Discussion for general questions
- Join our community chat (link in README)
- Email the maintainers for sensitive issues

Thank you for contributing to Padelyzer! 🏓