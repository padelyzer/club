# 🤖 Test Automation and CI/CD

## 📋 Resumen

Esta guía detalla la automatización de tests y la integración con pipelines de CI/CD, asegurando calidad continua y despliegues seguros.

## 🎯 Objetivos de Automatización

### Cobertura de CI/CD
- **Test Automation**: 100% de tests automatizados
- **Pipeline Coverage**: Todos los stages cubiertos
- **Quality Gates**: Criterios de calidad definidos
- **Deployment Automation**: Despliegue automático
- **Rollback Capability**: Reversión automática
- **Monitoring Integration**: Monitoreo post-deployment
- **Security Scanning**: Análisis de seguridad integrado

### Componentes del Pipeline
- ✅ Code Quality Checks
- ✅ Unit Test Execution
- ✅ Integration Testing
- ✅ E2E Test Suites
- ✅ Performance Testing
- ✅ Security Scanning
- ✅ Deployment Stages
- ✅ Post-Deployment Validation

## 🚀 GitHub Actions Workflows

### 1. Main CI/CD Pipeline
```yaml
# .github/workflows/main.yml
name: Main CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:

env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '18'
  POSTGRES_VERSION: '15'
  REDIS_VERSION: '7'
  
jobs:
  # Job 1: Code Quality
  code-quality:
    name: Code Quality Checks
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better analysis
          
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          
      - name: Cache Dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cache/pip
            ~/.cache/pre-commit
          key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
          
      - name: Install Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements/development.txt
          pip install pre-commit black flake8 mypy bandit safety
          
      - name: Run Pre-commit Hooks
        run: pre-commit run --all-files
        
      - name: Run Black Formatter
        run: black --check backend/
        
      - name: Run Flake8 Linter
        run: flake8 backend/ --config=.flake8
        
      - name: Run MyPy Type Checker
        run: mypy backend/ --config-file=mypy.ini
        
      - name: Security Scan with Bandit
        run: bandit -r backend/ -ll -f json -o bandit-report.json
        
      - name: Check Dependencies with Safety
        run: safety check --json --output safety-report.json
        
      - name: Upload Quality Reports
        uses: actions/upload-artifact@v3
        with:
          name: quality-reports
          path: |
            bandit-report.json
            safety-report.json
            
      - name: Comment PR with Quality Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const banditReport = JSON.parse(fs.readFileSync('bandit-report.json', 'utf8'));
            const safetyReport = JSON.parse(fs.readFileSync('safety-report.json', 'utf8'));
            
            const comment = `## 📊 Code Quality Report
            
            **Security Issues**: ${banditReport.results.length}
            **Vulnerable Dependencies**: ${safetyReport.vulnerabilities.length}
            
            <details>
            <summary>View Details</summary>
            
            ### Security Scan
            ${banditReport.results.map(r => `- ${r.issue_text}`).join('\n')}
            
            ### Dependency Check
            ${safetyReport.vulnerabilities.map(v => `- ${v.package}: ${v.vulnerability}`).join('\n')}
            
            </details>`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

  # Job 2: Backend Tests
  backend-tests:
    name: Backend Test Suite
    runs-on: ubuntu-latest
    needs: code-quality
    
    services:
      postgres:
        image: postgres:${{ env.POSTGRES_VERSION }}
        env:
          POSTGRES_USER: padelyzer
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: padelyzer_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
          
      redis:
        image: redis:${{ env.REDIS_VERSION }}
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
          
    strategy:
      matrix:
        test-group: [unit, integration, e2e]
        
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          
      - name: Install System Dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libpq-dev \
            gettext \
            chromium-browser \
            chromium-chromedriver
            
      - name: Cache Python Dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-test-${{ hashFiles('**/requirements*.txt') }}
          
      - name: Install Python Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements/testing.txt
          pip install coverage pytest-xdist pytest-timeout
          
      - name: Set Environment Variables
        run: |
          echo "DATABASE_URL=postgresql://padelyzer:testpass@localhost:5432/padelyzer_test" >> $GITHUB_ENV
          echo "REDIS_URL=redis://localhost:6379/0" >> $GITHUB_ENV
          echo "SECRET_KEY=test-secret-key-for-ci" >> $GITHUB_ENV
          echo "DEBUG=False" >> $GITHUB_ENV
          echo "TESTING=True" >> $GITHUB_ENV
          
      - name: Run Migrations
        run: |
          cd backend
          python manage.py migrate
          
      - name: Run ${{ matrix.test-group }} Tests
        run: |
          cd backend
          if [ "${{ matrix.test-group }}" = "unit" ]; then
            pytest tests/unit/ -v --cov=apps --cov-report=xml --cov-report=html --maxfail=5
          elif [ "${{ matrix.test-group }}" = "integration" ]; then
            pytest tests/integration/ -v --cov=apps --cov-report=xml --cov-report=html --maxfail=3
          elif [ "${{ matrix.test-group }}" = "e2e" ]; then
            pytest tests/e2e/ -v --cov=apps --cov-report=xml --cov-report=html --maxfail=1
          fi
          
      - name: Upload Coverage Reports
        uses: actions/upload-artifact@v3
        with:
          name: coverage-${{ matrix.test-group }}
          path: |
            backend/htmlcov/
            backend/coverage.xml
            
      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: backend/coverage.xml
          flags: backend-${{ matrix.test-group }}
          fail_ci_if_error: true

  # Job 3: Frontend Tests
  frontend-tests:
    name: Frontend Test Suite
    runs-on: ubuntu-latest
    needs: code-quality
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install Dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run Linting
        run: |
          cd frontend
          npm run lint
          
      - name: Run Type Checking
        run: |
          cd frontend
          npm run type-check
          
      - name: Run Unit Tests
        run: |
          cd frontend
          npm test -- --coverage --watchAll=false
          
      - name: Run E2E Tests
        run: |
          cd frontend
          npm run test:e2e:ci
          
      - name: Build Frontend
        run: |
          cd frontend
          npm run build
          
      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: frontend/out/

  # Job 4: Performance Tests
  performance-tests:
    name: Performance Testing
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          
      - name: Install Locust
        run: |
          pip install locust
          
      - name: Start Application
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 30  # Wait for services to be ready
          
      - name: Run Load Tests
        run: |
          locust \
            -f tests/performance/locustfile.py \
            --host=http://localhost:8000 \
            --users=100 \
            --spawn-rate=10 \
            --run-time=5m \
            --headless \
            --html=performance-report.html \
            --csv=performance-results
            
      - name: Analyze Performance Results
        run: |
          python scripts/analyze_performance.py \
            --input=performance-results_stats.csv \
            --baseline=tests/performance/baseline.json \
            --output=performance-analysis.json
            
      - name: Upload Performance Reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: |
            performance-report.html
            performance-analysis.json
            
      - name: Comment Performance Results
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const analysis = JSON.parse(fs.readFileSync('performance-analysis.json', 'utf8'));
            
            const comment = `## ⏱️ Performance Test Results
            
            **Response Time (p95)**: ${analysis.response_time_p95}ms
            **Requests/sec**: ${analysis.rps}
            **Error Rate**: ${analysis.error_rate}%
            
            ${analysis.passed ? '✅ Performance baseline met' : '❌ Performance regression detected'}`;
            
            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: comment
            });

  # Job 5: Security Scanning
  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy Security Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          
      - name: Upload Trivy Results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'Padelyzer'
          path: '.'
          format: 'ALL'
          args: >
            --enableRetired
            --enableExperimental
            
      - name: Upload OWASP Results
        uses: actions/upload-artifact@v3
        with:
          name: owasp-reports
          path: reports/

  # Job 6: Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests, security-scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy Backend to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
          RENDER_SERVICE_ID: ${{ secrets.RENDER_BACKEND_SERVICE_ID }}
        run: |
          curl -X POST \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": true}' \
            "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys"
            
      - name: Deploy Frontend to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npm i -g vercel
          cd frontend
          vercel --prod --token=$VERCEL_TOKEN
          
      - name: Run Smoke Tests
        run: |
          npm install -g newman
          newman run tests/postman/smoke-tests.json \
            --environment tests/postman/staging-env.json \
            --reporters cli,json \
            --reporter-json-export smoke-test-results.json
            
      - name: Notify Deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  # Job 7: Deploy to Production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests, security-scan, performance-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create Release Tag
        id: create_tag
        run: |
          VERSION=$(date +%Y.%m.%d-%H%M%S)
          echo "VERSION=$VERSION" >> $GITHUB_OUTPUT
          git tag -a "v$VERSION" -m "Production release $VERSION"
          git push origin "v$VERSION"
          
      - name: Deploy Backend
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
          RENDER_SERVICE_ID: ${{ secrets.RENDER_PROD_BACKEND_SERVICE_ID }}
        run: |
          # Deploy with zero-downtime
          curl -X POST \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
              "clearCache": true,
              "commitRef": "${{ steps.create_tag.outputs.VERSION }}"
            }' \
            "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys"
            
      - name: Deploy Frontend
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          cd frontend
          vercel --prod \
            --token=$VERCEL_TOKEN \
            --scope=${{ secrets.VERCEL_TEAM_ID }} \
            --yes
            
      - name: Update Database
        run: |
          # Run migrations
          python scripts/run_prod_migrations.py \
            --database-url=${{ secrets.PROD_DATABASE_URL }} \
            --backup-first
            
      - name: Warm Cache
        run: |
          python scripts/warm_cache.py \
            --redis-url=${{ secrets.PROD_REDIS_URL }} \
            --endpoints=/api/v1/clubs,/api/v1/courts
            
      - name: Verify Deployment
        run: |
          python scripts/verify_deployment.py \
            --url=https://api.padelyzer.com \
            --version=${{ steps.create_tag.outputs.VERSION }} \
            --timeout=300
            
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ steps.create_tag.outputs.VERSION }}
          release_name: Release ${{ steps.create_tag.outputs.VERSION }}
          draft: false
          prerelease: false
```

### 2. Pull Request Validation
```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate-pr:
    name: Validate Pull Request
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Check PR Title
        uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Check File Changes
        run: |
          # Get changed files
          CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD)
          
          # Check for sensitive files
          SENSITIVE_FILES=".env|secrets|credentials|private"
          if echo "$CHANGED_FILES" | grep -E "$SENSITIVE_FILES"; then
            echo "::error::PR contains sensitive files"
            exit 1
          fi
          
      - name: Check Commit Messages
        run: |
          # Validate commit messages follow conventional commits
          npm install -g @commitlint/cli @commitlint/config-conventional
          echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
          
          # Check all commits in PR
          git log origin/${{ github.base_ref }}..HEAD --format=%s | \
            while read commit; do
              echo "$commit" | commitlint
            done
            
      - name: Label PR
        uses: actions/labeler@v4
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
          configuration-path: .github/labeler.yml
          
      - name: Size Label
        uses: codelytv/pr-size-labeler@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          xs_max_size: '10'
          s_max_size: '100'
          m_max_size: '500'
          l_max_size: '1000'
          
      - name: Check Test Coverage
        run: |
          # Download base branch coverage
          curl -o base-coverage.json \
            https://codecov.io/api/gh/${{ github.repository }}/branch/${{ github.base_ref }}/coverage
            
          # Compare with current coverage
          python scripts/compare_coverage.py \
            --base=base-coverage.json \
            --current=coverage.json \
            --threshold=80 \
            --no-decrease
```

### 3. Scheduled Tests
```yaml
# .github/workflows/scheduled-tests.yml
name: Scheduled Tests

on:
  schedule:
    # Run at 2 AM UTC every day
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  nightly-e2e:
    name: Nightly E2E Tests
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        browser: [chrome, firefox, safari]
        
    steps:
      - uses: actions/checkout@v4
      
      - name: Run E2E Tests on ${{ matrix.browser }}
        run: |
          npm install -g playwright
          cd frontend
          npm ci
          npx playwright test --browser=${{ matrix.browser }}
          
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results-${{ matrix.browser }}
          path: frontend/test-results/
          
  security-audit:
    name: Weekly Security Audit
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 0 * * 0'  # Sundays only
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Full Security Audit
        run: |
          # Install security tools
          pip install safety bandit
          npm install -g snyk audit-ci
          
          # Python security audit
          safety check --json > safety-report.json
          bandit -r backend/ -f json > bandit-report.json
          
          # JavaScript security audit
          cd frontend && npm audit --json > npm-audit.json
          snyk test --json > snyk-report.json
          
      - name: Create Security Issue
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Weekly Security Audit Failed',
              body: 'The weekly security audit has found vulnerabilities. Check the workflow run for details.',
              labels: ['security', 'high-priority']
            });
```

## 📦 Test Configuration Files

### 1. Pre-commit Configuration
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ['--maxkb=500']
      - id: check-case-conflict
      - id: check-merge-conflict
      - id: check-json
      - id: detect-private-key
      
  - repo: https://github.com/psf/black
    rev: 23.12.0
    hooks:
      - id: black
        language_version: python3.11
        
  - repo: https://github.com/pycqa/isort
    rev: 5.13.0
    hooks:
      - id: isort
        args: ["--profile", "black"]
        
  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: ['--config=.flake8']
        
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]
        
  - repo: https://github.com/pycqa/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: ['-ll', '-r', 'backend/']
        
  - repo: https://github.com/commitizen-tools/commitizen
    rev: v3.13.0
    hooks:
      - id: commitizen
        stages: [commit-msg]
```

### 2. Test Environment Configuration
```python
# scripts/setup_test_env.py
#!/usr/bin/env python3
"""
Setup test environment for CI/CD pipeline
"""

import os
import sys
import subprocess
import json
from pathlib import Path

class TestEnvironmentSetup:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.backend_dir = self.project_root / 'backend'
        self.frontend_dir = self.project_root / 'frontend'
        
    def setup_backend(self):
        """Setup backend test environment"""
        print("🔧 Setting up backend test environment...")
        
        # Create test database
        env = os.environ.copy()
        env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/test_db'
        
        # Run migrations
        subprocess.run(
            ['python', 'manage.py', 'migrate'],
            cwd=self.backend_dir,
            env=env,
            check=True
        )
        
        # Load test fixtures
        fixtures = [
            'users.json',
            'clubs.json',
            'courts.json'
        ]
        
        for fixture in fixtures:
            fixture_path = self.backend_dir / 'fixtures' / fixture
            if fixture_path.exists():
                subprocess.run(
                    ['python', 'manage.py', 'loaddata', fixture],
                    cwd=self.backend_dir,
                    env=env,
                    check=True
                )
                
        print("✅ Backend test environment ready")
        
    def setup_frontend(self):
        """Setup frontend test environment"""
        print("🔧 Setting up frontend test environment...")
        
        # Install dependencies
        subprocess.run(
            ['npm', 'ci'],
            cwd=self.frontend_dir,
            check=True
        )
        
        # Build frontend
        subprocess.run(
            ['npm', 'run', 'build'],
            cwd=self.frontend_dir,
            check=True
        )
        
        print("✅ Frontend test environment ready")
        
    def setup_services(self):
        """Setup required services"""
        print("🔧 Setting up services...")
        
        services = [
            {
                'name': 'PostgreSQL',
                'check': ['pg_isready', '-h', 'localhost'],
                'start': ['docker', 'run', '-d', '--name', 'postgres-test',
                         '-e', 'POSTGRES_PASSWORD=postgres',
                         '-p', '5432:5432', 'postgres:15']
            },
            {
                'name': 'Redis',
                'check': ['redis-cli', 'ping'],
                'start': ['docker', 'run', '-d', '--name', 'redis-test',
                         '-p', '6379:6379', 'redis:7']
            }
        ]
        
        for service in services:
            # Check if service is running
            result = subprocess.run(
                service['check'],
                capture_output=True
            )
            
            if result.returncode != 0:
                print(f"🚀 Starting {service['name']}...")
                subprocess.run(service['start'], check=True)
                
        print("✅ All services ready")
        
    def generate_test_report(self):
        """Generate test environment report"""
        report = {
            'python_version': sys.version,
            'node_version': subprocess.run(
                ['node', '--version'],
                capture_output=True,
                text=True
            ).stdout.strip(),
            'environment': 'test',
            'services': {
                'postgresql': 'running',
                'redis': 'running'
            }
        }
        
        report_path = self.project_root / 'test-env-report.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"📄 Test environment report: {report_path}")
        
    def run(self):
        """Run complete setup"""
        try:
            self.setup_services()
            self.setup_backend()
            self.setup_frontend()
            self.generate_test_report()
            print("
🎉 Test environment setup complete!")
            return 0
        except Exception as e:
            print(f"
❌ Setup failed: {e}")
            return 1

if __name__ == '__main__':
    setup = TestEnvironmentSetup()
    sys.exit(setup.run())
```

### 3. Test Coverage Configuration
```ini
# .coveragerc
[run]
source = .
omit =
    */migrations/*
    */tests/*
    */venv/*
    */virtualenv/*
    */node_modules/*
    */config/*
    */settings/*
    manage.py
    */apps.py
    */admin.py
    */wsgi.py
    */asgi.py

[report]
precision = 2
skip_covered = False
show_missing = True

[html]
directory = htmlcov

[xml]
output = coverage.xml

[json]
output = coverage.json
```

## 🔍 Test Analysis Scripts

### 1. Coverage Analysis
```python
# scripts/analyze_coverage.py
#!/usr/bin/env python3
"""
Analyze test coverage and generate reports
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

class CoverageAnalyzer:
    def __init__(self, coverage_file: str):
        self.coverage_file = Path(coverage_file)
        self.coverage_data = self._load_coverage()
        
    def _load_coverage(self) -> Dict:
        """Load coverage data from JSON file"""
        with open(self.coverage_file, 'r') as f:
            return json.load(f)
            
    def get_summary(self) -> Dict[str, float]:
        """Get coverage summary"""
        files = self.coverage_data['files']
        
        total_statements = 0
        covered_statements = 0
        
        for file_data in files.values():
            summary = file_data['summary']
            total_statements += summary['num_statements']
            covered_statements += summary['covered_statements']
            
        coverage_percent = (
            (covered_statements / total_statements * 100)
            if total_statements > 0 else 0
        )
        
        return {
            'total_statements': total_statements,
            'covered_statements': covered_statements,
            'coverage_percent': round(coverage_percent, 2)
        }
        
    def get_uncovered_files(self, threshold: float = 80.0) -> List[Tuple[str, float]]:
        """Get files below coverage threshold"""
        uncovered = []
        
        for filename, file_data in self.coverage_data['files'].items():
            summary = file_data['summary']
            coverage = summary['percent_covered']
            
            if coverage < threshold:
                uncovered.append((filename, coverage))
                
        return sorted(uncovered, key=lambda x: x[1])
        
    def generate_report(self) -> str:
        """Generate coverage report"""
        summary = self.get_summary()
        uncovered = self.get_uncovered_files()
        
        report = f"""
# Test Coverage Report

## Summary
- **Total Coverage**: {summary['coverage_percent']}%
- **Statements**: {summary['covered_statements']}/{summary['total_statements']}

## Files Below 80% Coverage
"""
        
        for filename, coverage in uncovered[:10]:  # Top 10
            report += f"- `{filename}`: {coverage}%\n"
            
        return report
        
    def check_coverage_threshold(self, threshold: float) -> bool:
        """Check if coverage meets threshold"""
        summary = self.get_summary()
        return summary['coverage_percent'] >= threshold

def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_coverage.py <coverage.json>")
        sys.exit(1)
        
    analyzer = CoverageAnalyzer(sys.argv[1])
    
    # Generate report
    report = analyzer.generate_report()
    print(report)
    
    # Check threshold
    if not analyzer.check_coverage_threshold(80.0):
        print("\n❌ Coverage below 80% threshold")
        sys.exit(1)
    else:
        print("\n✅ Coverage meets threshold")
        
if __name__ == '__main__':
    main()
```

### 2. Performance Baseline Comparison
```python
# scripts/compare_performance.py
#!/usr/bin/env python3
"""
Compare performance test results with baseline
"""

import json
import sys
from pathlib import Path
from typing import Dict, List

class PerformanceComparator:
    def __init__(self, baseline_file: str, current_file: str):
        self.baseline = self._load_json(baseline_file)
        self.current = self._load_json(current_file)
        
    def _load_json(self, filename: str) -> Dict:
        """Load JSON data from file"""
        with open(filename, 'r') as f:
            return json.load(f)
            
    def compare_metrics(self) -> Dict[str, Dict]:
        """Compare current metrics with baseline"""
        comparison = {}
        
        metrics = [
            'response_time_p50',
            'response_time_p95',
            'response_time_p99',
            'requests_per_second',
            'error_rate'
        ]
        
        for metric in metrics:
            baseline_value = self.baseline.get(metric, 0)
            current_value = self.current.get(metric, 0)
            
            if baseline_value > 0:
                change_percent = (
                    (current_value - baseline_value) / baseline_value * 100
                )
            else:
                change_percent = 0
                
            comparison[metric] = {
                'baseline': baseline_value,
                'current': current_value,
                'change_percent': round(change_percent, 2),
                'regression': self._is_regression(metric, change_percent)
            }
            
        return comparison
        
    def _is_regression(self, metric: str, change_percent: float) -> bool:
        """Check if metric change is a regression"""
        # Define thresholds for regression
        thresholds = {
            'response_time_p50': 10,  # 10% increase is regression
            'response_time_p95': 20,  # 20% increase is regression
            'response_time_p99': 30,  # 30% increase is regression
            'requests_per_second': -10,  # 10% decrease is regression
            'error_rate': 0.1  # Any increase is regression
        }
        
        threshold = thresholds.get(metric, 10)
        
        if metric == 'requests_per_second':
            return change_percent < threshold
        else:
            return change_percent > threshold
            
    def generate_report(self) -> str:
        """Generate comparison report"""
        comparison = self.compare_metrics()
        
        report = "# Performance Comparison Report\n\n"
        report += "| Metric | Baseline | Current | Change | Status |\n"
        report += "|--------|----------|---------|--------|--------|\n"
        
        has_regression = False
        
        for metric, data in comparison.items():
            status = "🔴" if data['regression'] else "🔵"
            if data['regression']:
                has_regression = True
                
            report += (
                f"| {metric} | {data['baseline']} | {data['current']} | "
                f"{data['change_percent']:+.2f}% | {status} |\n"
            )
            
        if has_regression:
            report += "\n⚠️ **Performance regression detected!**\n"
        else:
            report += "\n✅ **All performance metrics within acceptable range**\n"
            
        return report

def main():
    if len(sys.argv) < 3:
        print("Usage: compare_performance.py <baseline.json> <current.json>")
        sys.exit(1)
        
    comparator = PerformanceComparator(sys.argv[1], sys.argv[2])
    report = comparator.generate_report()
    print(report)
    
    # Exit with error if regression detected
    comparison = comparator.compare_metrics()
    if any(data['regression'] for data in comparison.values()):
        sys.exit(1)
        
if __name__ == '__main__':
    main()
```

## 🚀 Deployment Scripts

### 1. Zero-Downtime Deployment
```python
# scripts/deploy_zero_downtime.py
#!/usr/bin/env python3
"""
Zero-downtime deployment script
"""

import os
import sys
import time
import requests
import subprocess
from typing import List, Dict

class ZeroDowntimeDeployer:
    def __init__(self, environment: str):
        self.environment = environment
        self.health_check_url = self._get_health_check_url()
        self.deploy_timeout = 300  # 5 minutes
        
    def _get_health_check_url(self) -> str:
        """Get health check URL for environment"""
        urls = {
            'staging': 'https://staging-api.padelyzer.com/health/',
            'production': 'https://api.padelyzer.com/health/'
        }
        return urls.get(self.environment, '')
        
    def pre_deploy_checks(self) -> bool:
        """Run pre-deployment checks"""
        print("🔍 Running pre-deployment checks...")
        
        checks = [
            self._check_health(),
            self._check_migrations(),
            self._check_static_files(),
            self._backup_database()
        ]
        
        return all(checks)
        
    def _check_health(self) -> bool:
        """Check current system health"""
        try:
            response = requests.get(self.health_check_url, timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False
            
    def _check_migrations(self) -> bool:
        """Check for pending migrations"""
        result = subprocess.run(
            ['python', 'manage.py', 'showmigrations', '--plan'],
            capture_output=True,
            text=True
        )
        
        return '[ ]' not in result.stdout
        
    def _check_static_files(self) -> bool:
        """Verify static files are collected"""
        static_dir = Path('staticfiles')
        return static_dir.exists() and any(static_dir.iterdir())
        
    def _backup_database(self) -> bool:
        """Create database backup"""
        print("💾 Creating database backup...")
        
        backup_name = f"backup_{self.environment}_{int(time.time())}.sql"
        
        result = subprocess.run([
            'pg_dump',
            os.environ['DATABASE_URL'],
            '-f', backup_name
        ])
        
        return result.returncode == 0
        
    def deploy(self) -> bool:
        """Execute deployment"""
        print(f"🚀 Deploying to {self.environment}...")
        
        # Blue-green deployment
        steps = [
            self._deploy_new_version(),
            self._run_smoke_tests(),
            self._switch_traffic(),
            self._verify_deployment()
        ]
        
        for step in steps:
            if not step:
                print("❌ Deployment failed")
                self._rollback()
                return False
                
        print("✅ Deployment successful")
        return True
        
    def _deploy_new_version(self) -> bool:
        """Deploy new version to inactive slot"""
        # Implementation depends on hosting provider
        # Example for Render:
        
        api_key = os.environ.get('RENDER_API_KEY')
        service_id = os.environ.get('RENDER_SERVICE_ID')
        
        response = requests.post(
            f'https://api.render.com/v1/services/{service_id}/deploys',
            headers={'Authorization': f'Bearer {api_key}'},
            json={'clearCache': True}
        )
        
        if response.status_code != 201:
            return False
            
        # Wait for deployment
        deploy_id = response.json()['id']
        return self._wait_for_deployment(deploy_id)
        
    def _wait_for_deployment(self, deploy_id: str) -> bool:
        """Wait for deployment to complete"""
        start_time = time.time()
        
        while time.time() - start_time < self.deploy_timeout:
            status = self._get_deploy_status(deploy_id)
            
            if status == 'live':
                return True
            elif status == 'failed':
                return False
                
            time.sleep(10)
            
        return False
        
    def _run_smoke_tests(self) -> bool:
        """Run smoke tests on new deployment"""
        print("🧪 Running smoke tests...")
        
        tests = [
            ('GET', '/health/'),
            ('GET', '/api/v1/clubs/'),
            ('POST', '/api/v1/auth/login/')
        ]
        
        for method, endpoint in tests:
            url = f"{self.health_check_url.replace('/health/', '')}{endpoint}"
            
            try:
                if method == 'GET':
                    response = requests.get(url, timeout=10)
                else:
                    response = requests.post(
                        url,
                        json={'email': 'test@test.com', 'password': 'test'},
                        timeout=10
                    )
                    
                if response.status_code >= 500:
                    return False
                    
            except Exception:
                return False
                
        return True
        
    def _switch_traffic(self) -> bool:
        """Switch traffic to new version"""
        # Implementation depends on load balancer
        # This is a placeholder
        return True
        
    def _verify_deployment(self) -> bool:
        """Verify deployment is successful"""
        # Check version endpoint
        response = requests.get(f"{self.health_check_url.replace('/health/', '')}/version/")
        
        if response.status_code != 200:
            return False
            
        # Check critical metrics
        return self._check_metrics()
        
    def _check_metrics(self) -> bool:
        """Check post-deployment metrics"""
        # Monitor for 2 minutes
        start_time = time.time()
        error_count = 0
        
        while time.time() - start_time < 120:
            try:
                response = requests.get(self.health_check_url)
                if response.status_code != 200:
                    error_count += 1
                    
            except Exception:
                error_count += 1
                
            if error_count > 5:
                return False
                
            time.sleep(5)
            
        return True
        
    def _rollback(self):
        """Rollback to previous version"""
        print("🔄 Rolling back...")
        # Implementation depends on deployment strategy
        
def main():
    if len(sys.argv) < 2:
        print("Usage: deploy_zero_downtime.py <environment>")
        sys.exit(1)
        
    environment = sys.argv[1]
    
    if environment not in ['staging', 'production']:
        print("Environment must be 'staging' or 'production'")
        sys.exit(1)
        
    deployer = ZeroDowntimeDeployer(environment)
    
    if not deployer.pre_deploy_checks():
        print("❌ Pre-deployment checks failed")
        sys.exit(1)
        
    if deployer.deploy():
        sys.exit(0)
    else:
        sys.exit(1)
        
if __name__ == '__main__':
    main()
```

## 📊 Monitoring and Alerts

### 1. Post-Deployment Monitoring
```python
# scripts/monitor_deployment.py
#!/usr/bin/env python3
"""
Monitor deployment health and performance
"""

import time
import requests
import statistics
from datetime import datetime
from typing import List, Dict

class DeploymentMonitor:
    def __init__(self, base_url: str, duration: int = 300):
        self.base_url = base_url
        self.duration = duration  # Monitor duration in seconds
        self.metrics = {
            'response_times': [],
            'error_count': 0,
            'success_count': 0
        }
        
    def monitor(self) -> Dict:
        """Monitor deployment for specified duration"""
        print(f"📊 Monitoring {self.base_url} for {self.duration}s...")
        
        start_time = time.time()
        
        while time.time() - start_time < self.duration:
            self._check_endpoint()
            time.sleep(5)  # Check every 5 seconds
            
        return self._analyze_metrics()
        
    def _check_endpoint(self):
        """Check endpoint and record metrics"""
        try:
            start = time.time()
            response = requests.get(
                f"{self.base_url}/health/",
                timeout=10
            )
            response_time = time.time() - start
            
            self.metrics['response_times'].append(response_time)
            
            if response.status_code == 200:
                self.metrics['success_count'] += 1
            else:
                self.metrics['error_count'] += 1
                
        except Exception as e:
            self.metrics['error_count'] += 1
            print(f"⚠️ Error: {e}")
            
    def _analyze_metrics(self) -> Dict:
        """Analyze collected metrics"""
        response_times = self.metrics['response_times']
        
        if not response_times:
            return {'status': 'error', 'message': 'No data collected'}
            
        analysis = {
            'total_requests': len(response_times) + self.metrics['error_count'],
            'success_count': self.metrics['success_count'],
            'error_count': self.metrics['error_count'],
            'error_rate': (
                self.metrics['error_count'] / 
                (len(response_times) + self.metrics['error_count']) * 100
            ),
            'response_time': {
                'min': min(response_times),
                'max': max(response_times),
                'mean': statistics.mean(response_times),
                'median': statistics.median(response_times),
                'p95': self._percentile(response_times, 95),
                'p99': self._percentile(response_times, 99)
            }
        }
        
        # Determine health status
        if analysis['error_rate'] > 5:
            analysis['status'] = 'critical'
        elif analysis['error_rate'] > 1:
            analysis['status'] = 'warning'
        else:
            analysis['status'] = 'healthy'
            
        return analysis
        
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
        
    def generate_report(self, analysis: Dict) -> str:
        """Generate monitoring report"""
        status_emoji = {
            'healthy': '🔵',
            'warning': '🟡',
            'critical': '🔴'
        }
        
        report = f"""
# Deployment Monitoring Report

**Time**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Status**: {status_emoji.get(analysis['status'], '⚪')} {analysis['status'].upper()}

## Metrics
- **Total Requests**: {analysis['total_requests']}
- **Success Rate**: {100 - analysis['error_rate']:.2f}%
- **Error Rate**: {analysis['error_rate']:.2f}%

## Response Times
- **Mean**: {analysis['response_time']['mean']:.3f}s
- **Median**: {analysis['response_time']['median']:.3f}s
- **95th Percentile**: {analysis['response_time']['p95']:.3f}s
- **99th Percentile**: {analysis['response_time']['p99']:.3f}s
"""
        
        if analysis['status'] != 'healthy':
            report += "\n⚠️ **Action Required**: Investigate elevated error rates\n"
            
        return report
```

## 🎯 Test Execution Commands

### Local Test Execution
```bash
# Run all tests locally
make test

# Run specific test suite
pytest tests/unit/ -v
pytest tests/integration/ -v
pytest tests/e2e/ -v

# Run with coverage
pytest --cov=apps --cov-report=html

# Run in parallel
pytest -n auto
```

### CI/CD Commands
```bash
# Trigger manual workflow
gh workflow run main.yml

# View workflow runs
gh run list

# Watch workflow progress
gh run watch

# Download artifacts
gh run download <run-id>
```

### Deployment Commands
```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production --zero-downtime

# Rollback deployment
./scripts/rollback.sh production --to-version=v1.2.3

# Monitor deployment
./scripts/monitor_deployment.py https://api.padelyzer.com
```

---

**🎉 Felicitaciones!** Has completado la documentación completa de testing E2E para el backend. 

Esta guía proporciona una base sólida para:
- 🧪 Escribir tests completos y mantenibles
- 🚀 Automatizar el proceso de testing
- 📊implementar CI/CD efectivo
- 🛡️ Asegurar la calidad del código
- 📈 Monitorear el rendimiento
- 🔒 Mantener la seguridad

**Siguiente paso**: Implementar los tests siguiendo estas guías para alcanzar el objetivo de 85%+ de cobertura.