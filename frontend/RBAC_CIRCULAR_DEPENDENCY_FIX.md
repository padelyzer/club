# RBAC Module Circular Dependency Fix

## Problem
The RBAC module had a circular dependency issue where:
1. `hooks.ts` imported `NavigationPermissions` and `ActionPermissions` from `./permissions`
2. But these constants were actually defined in `utils.ts`
3. `utils.ts` imported from `permissions.ts`, creating a potential circular dependency

## Solution
Refactored the module structure to eliminate circular dependencies:

### 1. Created new files:
- **`types.ts`**: Contains shared interfaces (`ResourcePermissions`, `PermissionContext`)
- **`constants.ts`**: Contains constant mappings (`NavigationPermissions`, `ActionPermissions`)

### 2. Updated imports:
- `permissions.ts`: Now only exports `PERMISSIONS`, `Permission` type, and `ROLE_PERMISSIONS`
- `types.ts`: Imports `Permission` type from `permissions.ts` and exports interfaces
- `constants.ts`: Imports `Permission` type from `permissions.ts` and exports permission mappings
- `utils.ts`: Imports from all three files appropriately
- `hooks.ts`: Imports types from their respective files

### 3. Fixed import in components:
- Updated `ProtectedRoute.tsx` to import `NavigationPermissions` from `@/lib/rbac/constants`

## Module Structure After Fix
```
src/lib/rbac/
├── permissions.ts    # Core permission definitions and role mappings
├── types.ts         # Shared interfaces and types
├── constants.ts     # Navigation and action permission mappings
├── utils.ts         # Permission checking utility functions
├── hooks.ts         # React hooks for permission management
└── index.ts         # Module exports
```

## Verification
- No circular dependencies detected using `madge`
- All TypeScript types resolve correctly
- Module maintains full functionality while being properly organized