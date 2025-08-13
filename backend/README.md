# Padelyzer Backend

Backend API for Padelyzer - SaaS platform for padel club management in Mexico.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Local Development Setup

1. **Clone and setup environment**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

2. **Option A: Using Docker (Recommended)**
```bash
make docker-up
make docker-migrate
make docker-shell
# Inside container:
python manage.py createsuperuser
```

3. **Option B: Local Python Environment**
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
make install

# Run migrations
make migrate

# Create superuser
make createsuperuser

# Start development server
make dev
```

## 📁 Project Structure

```
backend/
├── apps/              # Django applications
│   ├── auth/         # Authentication & users
│   ├── root/         # SaaS management
│   ├── clubs/        # Club management
│   ├── reservations/ # Court reservations
│   ├── clients/      # Client CRM
│   ├── classes/      # Classes & academies
│   ├── tournaments/  # Tournament management
│   ├── leagues/      # League management
│   ├── finance/      # Financial module
│   ├── bi/          # Business Intelligence
│   └── notifications/# Notifications system
├── config/           # Project configuration
│   ├── settings/     # Modular settings
│   ├── urls.py      # URL configuration
│   └── wsgi.py      # WSGI configuration
├── core/            # Shared utilities
├── requirements/    # Dependencies
└── Makefile        # Development commands
```

## 🛠️ Available Commands

```bash
# Development
make dev            # Start development server
make shell          # Open Django shell
make migrate        # Run migrations

# Testing
make test           # Run tests
make test-coverage  # Run tests with coverage
make lint           # Run linters
make format         # Format code

# Docker
make docker-up      # Start containers
make docker-down    # Stop containers
make docker-logs    # View logs
make docker-shell   # Container shell
```

## 🔌 API Documentation

Once the server is running, API documentation is available at:
- Swagger UI: http://localhost:8000/api/schema/swagger/
- ReDoc: http://localhost:8000/api/schema/redoc/

## 🧪 Testing

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific app tests
pytest apps/reservations/

# Run in Docker
make docker-test
```

## 🔐 Authentication

The API uses JWT tokens for authentication:
1. Obtain token via `/api/auth/login/`
2. Include in headers: `Authorization: Bearer <token>`

## 🚀 Deployment

### Railway Deployment
```bash
# Install Railway CLI
# Configure your project
railway login
railway link

# Deploy
make deploy
```

### Environment Variables
See `.env.example` for all required environment variables.

## 📝 Code Style

- Follow PEP 8
- Use type hints
- Write docstrings
- Format with Black
- Sort imports with isort

## 🤝 Contributing

1. Create feature branch
2. Write tests
3. Ensure all tests pass
4. Format code: `make format`
5. Create pull request

## 📄 License

Proprietary - Padelyzer © 2024