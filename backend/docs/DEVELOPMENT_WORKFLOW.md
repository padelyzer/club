# Flujo de Trabajo de Desarrollo - Padelyzer Backend

## 🚀 Inicio Rápido

### 1. Configuración Inicial

```bash
# Clonar el repositorio
git clone <repository-url>
cd backend/

# Crear y activar entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate  # Windows

# Instalar dependencias y herramientas
make setup-dev
```

### 2. Configuración de Base de Datos

```bash
# Crear base de datos PostgreSQL (desarrollo)
createdb padelyzer_dev

# Ejecutar migraciones
make migrate

# Crear superusuario
make create-superuser

# Cargar datos de prueba (opcional)
python manage.py loaddata fixtures/sample_data.json
```

### 3. Variables de Entorno

Crear archivo `.env` en la raíz del backend:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://user:password@localhost:5432/padelyzer_dev

# Redis
REDIS_URL=redis://localhost:6379/0

# Email (desarrollo)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Stripe (usar claves de prueba)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Twilio (opcional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## 📝 Flujo de Desarrollo

### 1. Antes de Empezar

```bash
# Actualizar rama principal
git checkout main
git pull origin main

# Crear rama para nueva funcionalidad
git checkout -b feature/nombre-descriptivo

# Verificar que todo funciona
make test
```

### 2. Durante el Desarrollo

#### A. Escribir Código

1. **Seguir convenciones de nombres**
   - Clases: `PascalCase`
   - Funciones/variables: `snake_case`
   - Constantes: `UPPER_SNAKE_CASE`

2. **Agregar Type Hints**
   ```python
   def calculate_price(
       base_amount: Decimal,
       tax_rate: float = 0.16
   ) -> Dict[str, Decimal]:
       """Calculate price with tax breakdown."""
       # Implementation
   ```

3. **Escribir Docstrings**
   ```python
   def process_payment(
       amount: Decimal,
       method: PaymentMethod
   ) -> PaymentResult:
       """
       Process a payment transaction.
       
       Args:
           amount: Payment amount in MXN
           method: Payment method (card, cash, transfer)
           
       Returns:
           PaymentResult with transaction details
           
       Raises:
           PaymentError: If payment processing fails
       """
   ```

#### B. Escribir Tests

1. **Test Unitario**
   ```python
   # tests/unit/test_utils.py
   def test_calculate_price_with_default_tax():
       result = calculate_price(Decimal('100.00'))
       assert result['total'] == Decimal('116.00')
       assert result['tax'] == Decimal('16.00')
   ```

2. **Test de Integración**
   ```python
   # tests/integration/test_reservations.py
   @pytest.mark.django_db
   def test_create_reservation_flow(api_client, court):
       response = api_client.post('/api/reservations/', {
           'court': court.id,
           'date': '2024-01-20',
           'start_time': '10:00',
           'duration_minutes': 90
       })
       assert response.status_code == 201
   ```

3. **Usar Factories**
   ```python
   def test_club_creation():
       club = ClubFactory(name="Test Padel Club")
       courts = CourtFactory.create_batch(4, club=club)
       
       assert club.courts.count() == 4
   ```

#### C. Verificar Calidad

```bash
# Formatear código
make format

# Verificar linting
make lint

# Verificar tipos
make type-check

# Ejecutar tests
make test

# Ver cobertura
make test-cov
```

### 3. Antes de Hacer Commit

#### A. Verificar Cambios

```bash
# Ver estado
git status

# Ver diferencias
git diff

# Ejecutar todas las verificaciones
make quality
```

#### B. Hacer Commit

```bash
# Agregar archivos
git add .

# Commit con mensaje descriptivo
git commit -m "feat(clubs): add court availability calendar

- Implement availability checking algorithm
- Add calendar view component
- Include timezone support
- Add tests for edge cases"
```

**Formato de mensajes de commit:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan funcionalidad)
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

### 4. Proceso de Review

#### A. Crear Pull Request

```bash
# Push a repositorio
git push origin feature/nombre-descriptivo
```

**En el PR incluir:**
- Descripción clara de cambios
- Screenshots si hay cambios visuales
- Lista de verificación:
  - [ ] Tests agregados/actualizados
  - [ ] Documentación actualizada
  - [ ] Sin errores de linting
  - [ ] Cobertura de tests mantenida/mejorada

#### B. Responder a Feedback

```bash
# Hacer cambios solicitados
git add .
git commit -m "fix: address PR feedback"
git push
```

## 🧪 Testing

### Ejecutar Tests Específicos

```bash
# Un archivo específico
pytest tests/test_utils.py

# Una clase específica
pytest tests/test_utils.py::TestCalculatePrice

# Un test específico
pytest tests/test_utils.py::TestCalculatePrice::test_with_custom_tax

# Tests por marca
pytest -m "not slow"  # Excluir tests lentos
pytest -m integration  # Solo tests de integración
```

### Tests en Paralelo

```bash
# Usar todos los cores
pytest -n auto

# Usar 4 cores específicos
pytest -n 4
```

### Debugging Tests

```bash
# Mostrar print statements
pytest -s

# Detener en primer fallo
pytest -x

# Entrar en debugger en fallos
pytest --pdb

# Ver más detalles
pytest -vv
```

## 🐛 Debugging

### Django Shell Plus

```bash
# Shell interactivo con modelos cargados
make shell

# En el shell
>>> from apps.clubs.models import Club
>>> Club.objects.all()
>>> 
>>> # Con IPython features
>>> %timeit Club.objects.count()
```

### Django Debug Toolbar

Habilitado automáticamente en desarrollo. Acceder a cualquier página y ver panel lateral.

### Logging

```python
import logging

logger = logging.getLogger(__name__)

def process_data(data):
    logger.debug(f"Processing data: {data}")
    try:
        result = complex_operation(data)
        logger.info(f"Successfully processed: {result}")
        return result
    except Exception as e:
        logger.error(f"Error processing data: {e}", exc_info=True)
        raise
```

### PDB Debugging

```python
def complex_function():
    # Agregar breakpoint
    import pdb; pdb.set_trace()
    
    # O en Python 3.7+
    breakpoint()
```

## 📊 Performance

### Profiling

```bash
# Profiling de función específica
python -m cProfile -s cumulative manage.py test

# Line profiler
kernprof -l -v script.py

# Memory profiler
python -m memory_profiler script.py
```

### Django Silk

Acceder a `/silk/` en desarrollo para ver:
- Queries ejecutadas
- Tiempo de respuesta
- Profiling detallado

### Optimización de Queries

```python
# Malo - N+1 queries
clubs = Club.objects.all()
for club in clubs:
    print(club.courts.count())  # Query por cada club

# Bueno - 1 query
clubs = Club.objects.prefetch_related('courts').all()
for club in clubs:
    print(club.courts.count())  # No queries adicionales

# Con select_related para ForeignKey
reservations = Reservation.objects.select_related(
    'court__club',
    'client__user'
).all()
```

## 🚀 Deployment

### Pre-deployment Checklist

```bash
# Verificar configuración de producción
python manage.py check --deploy

# Generar SECRET_KEY segura
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Compilar archivos estáticos
make collectstatic

# Verificar migraciones
python manage.py showmigrations

# Ejecutar tests finales
make test
```

### Variables de Producción

```env
# Django
SECRET_KEY=<secure-random-key>
DEBUG=False
ALLOWED_HOSTS=padelyzer.com,www.padelyzer.com

# Database (usar conexión SSL)
DATABASE_URL=postgres://user:pass@host:5432/padelyzer_prod?sslmode=require

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
```

## 📚 Recursos

### Documentación Interna
- [Guía de Type Hints](./PYTHON_TYPE_HINTS_GUIDE.md)
- [Reporte de Mejores Prácticas](../PYTHON_BEST_PRACTICES_REVIEW.md)
- [Arquitectura del Sistema](./ARCHITECTURE.md)

### Herramientas Útiles
- **HTTPie**: `http GET localhost:8000/api/clubs/`
- **Django Extensions**: `python manage.py show_urls`
- **DB Backup**: `python manage.py dbbackup`

### Comandos Alias Recomendados

Agregar a `~/.bashrc` o `~/.zshrc`:

```bash
alias dj="python manage.py"
alias djr="python manage.py runserver"
alias djm="python manage.py migrate"
alias djmm="python manage.py makemigrations"
alias djt="pytest"
alias djsh="python manage.py shell_plus"
```

## 🆘 Solución de Problemas Comunes

### Migraciones Conflictivas

```bash
# Listar migraciones
python manage.py showmigrations

# Resetear migraciones de una app (CUIDADO)
python manage.py migrate app_name zero

# Fusionar migraciones
python manage.py makemigrations --merge
```

### Problemas de Cache

```bash
# Limpiar cache de Redis
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
```

### Problemas de Permisos

```bash
# Verificar permisos de usuario
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.get(email='user@example.com')
>>> user.get_all_permissions()
```

---

**¿Necesitas ayuda?** Consulta la documentación o pregunta al equipo en el canal de desarrollo.