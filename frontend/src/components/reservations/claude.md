# Componentes: reservations

## 📁 Propósito
Sistema de reservas de canchas

## 📦 Archivos Principales
- optimized-booking-flow.tsx
- modern-calendar-view.tsx
- apple-style-reservations-list.tsx
- reservation-filters.tsx
- time-slot-picker.tsx
- index.ts (barrel export)

## ⚠️ Componentes Críticos
- Calendar
- TimeSlots
- BookingForm

## 🔌 Integración con Backend
API: /api/reservations/*

## 🎨 Patrones de Diseño

### Props Types
Todos los componentes deben tener interfaces TypeScript:
```typescript
interface ComponentProps {
  // Definir props aquí
}
```

### Estado
- Preferir hooks locales para estado de UI
- Usar Zustand para estado compartido
- No usar useState para datos del servidor

## 🚨 Cambios Peligrosos

1. **NO** cambiar props sin actualizar todos los usos
2. **NO** modificar lógica de autenticación sin testing
3. **CUIDADO** con efectos secundarios en useEffect
4. **NO** hacer llamadas API directas - usar hooks

## 🧪 Testing

```typescript
// Ejemplo de test
import { render, screen } from '@testing-library/react'
import { ComponentName } from './ComponentName'

test('renders correctly', () => {
  render(<ComponentName />)
  expect(screen.getByText('Expected text')).toBeInTheDocument()
})
```

## 📝 Checklist de Componente Nuevo

- [ ] Interface TypeScript para props
- [ ] Manejo de estados de carga/error
- [ ] Responsive design (mobile-first)
- [ ] Accesibilidad (ARIA labels)
- [ ] Internacionalización (useTranslations)
- [ ] Documentación de props
