# 🎨 Frontend Development - Claude Assistant

## 🚨 CRITICAL: NO DUPLICATE COMPONENTS/PAGES

### ⛔ BEFORE Creating ANY Component/Page

```bash
# CHECK for existing components
find frontend/src -name "*ComponentName*" -type f
find frontend/src -name "*dashboard*" -type d
find frontend/src -name "*login*" -type d

# APPROVED PATHS ONLY:
# ✅ app/[locale]/dashboard-produccion/ ← USE THIS FOR DASHBOARD
# ✅ app/[locale]/clubs/ ← USE THIS FOR CLUBS
# ✅ app/[locale]/reservations/ ← USE THIS FOR BOOKINGS
# ✅ app/[locale]/login-simple/ ← USE THIS FOR LOGIN
# ✅ components/shared/ ← SHARED COMPONENTS HERE
# ✅ components/ui/ ← SHADCN COMPONENTS ONLY

# FORBIDDEN PATHS:
# ❌ dashboard/, dashboard-pro/, dashboard-integrado/, etc.
# ❌ login/, login-minimal/, login-clubs/, etc.
# ❌ clubs-simple/, clubs-test/, clubs-static/, etc.
# ❌ *-test, *-backup, *-v2, *-new, *-old
```

### 📁 Frontend Structure (ENFORCED)
```
frontend/src/
├── app/                 # Next.js 14 App Router
│   ├── [locale]/       # i18n routes
│   │   ├── dashboard-produccion/ ✅ PRODUCTION DASHBOARD
│   │   ├── clubs/               ✅ CLUBS MODULE
│   │   ├── reservations/        ✅ BOOKINGS
│   │   ├── login-simple/        ✅ LOGIN
│   │   ├── classes/             📝 CREATE HERE
│   │   ├── tournaments/         📝 CREATE HERE
│   │   └── [NEW FEATURES]/      📝 ADD NEW HERE
│   │
│   ├── ❌ dashboard/            # DELETE
│   ├── ❌ dashboard-integrado/  # DELETE
│   ├── ❌ dashboard-pro/        # DELETE
│   ├── ❌ clubs-test/           # DELETE
│   └── ❌ login-minimal/        # DELETE
│
├── components/
│   ├── ui/            # shadcn/ui ONLY - DO NOT MODIFY
│   ├── shared/        # REUSABLE components
│   ├── dashboard/     # Dashboard specific (USE CAREFULLY)
│   ├── reservations/  # Booking components
│   └── [module]/      # Module-specific components
│
├── lib/
│   ├── api/          # ONE API client - DO NOT DUPLICATE
│   ├── utils/        # Shared utilities - DO NOT DUPLICATE
│   └── hooks/        # Custom hooks - CHECK BEFORE CREATING
│
├── store/            # Zustand ONLY - NO REDUX, NO CONTEXT API
└── types/           # TypeScript definitions - ONE PER MODULE
```

## 🚨 IMMEDIATE ACTION REQUIRED

### DELETE These Duplicate Folders:
```bash
# Run this cleanup command:
cd frontend/src/app

# List duplicates to delete
ls -la | grep -E "dashboard-(?!produccion)|clubs-(?!$)|login-(?!simple)"

# These should be DELETED:
rm -rf dashboard dashboard-integrado dashboard-pro dashboard-pro-replacement
rm -rf clubs-advanced clubs-export-test clubs-favoritos clubs-offline-test
rm -rf clubs-simple clubs-static clubs-test clubs-test-full
rm -rf login-clubs login-minimal
rm -rf demo-* debug-* test-* professional-demo
```

## 🎯 Current Frontend Priorities

### This Week (Critical 🔴)

1. **Consolidate Dashboard Versions**
   ```bash
   # USE ONLY: app/[locale]/dashboard-produccion/
   # MERGE useful features from other versions
   # DELETE all other dashboard folders
   ```

2. **Complete Stripe Integration UI**
   ```bash
   # MODIFY: components/shared/PaymentForm.tsx
   # DO NOT CREATE: PaymentFormV2, PaymentFormNew, etc.
   ```

3. **Notification System UI**
   ```bash
   # CREATE: components/shared/NotificationCenter.tsx
   # USE: Sonner for toasts (already installed)
   # DO NOT: Install new notification libraries
   ```

## 🎨 Component Patterns to Follow

### Page Component Pattern (EXACT LOCATION)
```tsx
// app/[locale]/[module]/page.tsx ← ONLY VALID PATH
// DO NOT CREATE: app/[module]-test/page.tsx

import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'Page Title | Padelyzer',
  description: 'Page description from Notion'
}

export default async function PageName() {
  const t = await getTranslations('PageName')
  
  return (
    <div className="container mx-auto py-6">
      {/* USE EXISTING COMPONENTS */}
      <PageHeader title={t('title')} />
      <PageContent />
    </div>
  )
}
```

### Client Component Pattern (CHECK BEFORE CREATING)
```tsx
'use client'

// BEFORE CREATING: Check if similar component exists
// find src/components -name "*Similar*"

import { useState, useEffect } from 'react'
import { useApi } from '@/lib/hooks/useApi' // USE EXISTING
import { useToast } from '@/components/ui/use-toast' // USE EXISTING

interface ComponentProps {
  // Props based on Notion specs
}

// Name must be descriptive and unique
export function ComponentName({ ...props }: ComponentProps) {
  // USE EXISTING hooks and utilities
  const { toast } = useToast()
  const { data, loading, error } = useApi('/endpoint')
  
  if (loading) return <Skeleton /> // USE EXISTING Skeleton
  if (error) return <ErrorState />  // USE EXISTING ErrorState
  
  return (
    <div className="space-y-4">
      {/* UI based on Notion designs */}
    </div>
  )
}
```

### Form Pattern (USE EXISTING PATTERNS)
```tsx
'use client'

// USE react-hook-form + zod (ALREADY INSTALLED)
// DO NOT install formik, react-final-form, etc.

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form } from '@/components/ui/form' // USE EXISTING

const formSchema = z.object({
  field: z.string().min(1, 'Required'),
})

type FormData = z.infer<typeof formSchema>

export function FormComponent() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })
  
  return (
    <Form {...form}>
      {/* USE EXISTING Form components */}
    </Form>
  )
}
```

## 🎭 UI Component Library (USE ONLY THESE)

### shadcn/ui Components (ALREADY INSTALLED):
```tsx
// ALWAYS use these instead of creating new ones
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Table } from '@/components/ui/table'
import { Form } from '@/components/ui/form'
import { Tabs } from '@/components/ui/tabs'
import { Select } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Toast } from '@/components/ui/toast'

// DO NOT CREATE custom versions of these
// DO NOT INSTALL Material-UI, Ant Design, Chakra, etc.
```

### Adding New shadcn Component:
```bash
# ONLY if doesn't exist
npx shadcn-ui@latest add [component-name]

# DO NOT create custom alternatives
```

## 🌍 Internationalization (USE EXISTING)

### Translation Files Location:
```
src/locales/
├── es/
│   ├── common.json      # USE THIS
│   ├── dashboard.json   # USE THIS
│   └── [module].json    # ADD HERE
└── en/
    └── ... (same structure)

# DO NOT CREATE: locales-v2/, translations/, i18n/, etc.
```

## 🔄 State Management (ZUSTAND ONLY)

### Store Pattern (USE EXISTING STORES):
```tsx
// store/useModuleStore.ts
// CHECK FIRST: ls src/store/

import { create } from 'zustand'

// DO NOT USE: Redux, MobX, Recoil, Jotai, Valtio
// DO NOT CREATE: StoreV2, AlternativeStore, etc.

export const useModuleStore = create((set, get) => ({
  // State and actions
}))
```

## 🔗 API Integration (ONE CLIENT)

### API Client (USE EXISTING):
```tsx
// lib/api/client.ts ← USE THIS ONLY
// DO NOT CREATE: apiV2.ts, newClient.ts, alternativeApi.ts

import { api } from '@/lib/api/client'

// USE EXISTING METHODS:
api.get('/endpoint')
api.post('/endpoint', data)
api.put('/endpoint', data)
api.delete('/endpoint')
```

## 🎨 Styling Guidelines (TAILWIND ONLY)

### TailwindCSS Classes (NO ALTERNATIVES):
```tsx
// USE Tailwind utility classes
className="flex flex-col gap-4 p-4"

// DO NOT USE:
// ❌ styled-components
// ❌ emotion
// ❌ CSS modules
// ❌ Sass/SCSS
// ❌ inline styles

// USE cn() for conditional classes
import { cn } from '@/lib/utils'
```

## ⚡ Performance Optimization

### Image Optimization (USE NEXT/IMAGE):
```tsx
import Image from 'next/image'

// DO NOT USE: <img> tags
// DO NOT INSTALL: react-image, cloudinary, etc.
```

### Code Splitting (USE DYNAMIC):
```tsx
import dynamic from 'next/dynamic'

// DO NOT CREATE multiple versions for performance
const Component = dynamic(() => import('./Component'))
```

## 🧪 Testing Requirements

### Test Files (SAME LOCATION):
```tsx
// Component.tsx
// Component.test.tsx ← SAME FOLDER

// DO NOT CREATE:
// - tests/Component.test.tsx
// - __tests__/Component.test.tsx
// - Component.spec.tsx
```

## 🐛 Common Issues & Solutions

### Issue: Component exists in multiple places
```bash
# Solution: DELETE DUPLICATES, keep only one
find . -name "ComponentName*" -type f
# Keep the one in components/shared or components/[module]
```

### Issue: Multiple dashboard versions
```bash
# Solution: USE dashboard-produccion ONLY
# Merge any useful code, then DELETE others
```

### Issue: Duplicate API calls
```bash
# Solution: USE existing API client
# Check lib/api/ for existing methods
```

## 📝 Quick Frontend Tasks

### Create New Page (CHECK FIRST):
```bash
# 1. Check if exists
ls app/[locale]/ | grep [feature]

# 2. If not exists, create in correct location
mkdir -p app/[locale]/[feature]
touch app/[locale]/[feature]/page.tsx

# DO NOT CREATE: [feature]-test, [feature]-v2, etc.
```

### Add Component (CHECK FIRST):
```bash
# 1. Check if similar exists
find components -name "*Similar*"

# 2. If truly new, add to correct location
touch components/shared/NewComponent.tsx
# OR
touch components/[module]/NewComponent.tsx
```

## 🔍 Cleanup Commands

### Find Duplicates:
```bash
# Find duplicate dashboards
find . -type d -name "*dashboard*" | grep -v produccion

# Find test/backup files
find . -name "*-test*" -o -name "*-backup*" -o -name "*-v2*"

# Find duplicate components
find components -name "*.tsx" | xargs basename | sort | uniq -d
```

### Clean Project:
```bash
# Remove test pages
rm -rf app/*-test app/*-demo app/*-simple

# Remove backup files
find . -name "*.backup" -o -name "*.old" -delete

# Remove empty folders
find . -type d -empty -delete
```

## ⛔ FORBIDDEN ACTIONS - IMMEDIATE REJECTION

1. **Creating dashboard-v3, dashboard-final, etc.**
2. **Making "test" versions of components**
3. **Installing new UI libraries** (we have shadcn)
4. **Creating alternative state management** (use Zustand)
5. **Making new API clients** (use existing)
6. **Adding CSS frameworks** (use Tailwind)
7. **Creating backup components** (.backup, .old)
8. **Duplicate pages** for "testing"
9. **Alternative routing** systems
10. **Custom form libraries** (use react-hook-form)

## 📚 File Naming Conventions

### ✅ CORRECT:
```
app/[locale]/dashboard-produccion/page.tsx
components/shared/ReservationCard.tsx
lib/api/client.ts
store/useReservationStore.ts
```

### ❌ WRONG:
```
app/[locale]/dashboard-new/page.tsx
components/shared/ReservationCardV2.tsx
lib/api/client-optimized.ts
store/useReservationStoreBackup.ts
```

## 🔄 Before Every Change

### Checklist:
```bash
# 1. Check if component/page exists
find . -name "*[component]*"

# 2. Check approved locations
# app/[locale]/dashboard-produccion/
# components/shared/
# components/[module]/

# 3. Verify no duplicates
ls app/[locale]/ | grep [feature]

# 4. Use existing utilities
# Check lib/utils, lib/hooks, lib/api

# 5. Test changes
npm run type-check
npm test

# 6. Clean up
find . -name "*-test*" -delete
```

---

**CRITICAL REMINDERS**:
- ⚠️ dashboard-produccion is the ONLY dashboard
- ⚠️ login-simple is the ONLY login
- ⚠️ Delete ALL duplicate versions immediately
- ⚠️ NEVER create test/backup versions
- ⚠️ Check before creating ANYTHING

**Main Context**: See `/Users/ja/PZR4/claude.md`
**Frontend Root**: `/Users/ja/PZR4/frontend`
