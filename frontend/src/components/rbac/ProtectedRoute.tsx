'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Permission } from '@/lib/rbac/permissions';
import { NavigationPermissions } from '@/lib/rbac/constants';
import {
  usePermission,
  useAnyPermission,
  useNavigationAccess,
  usePermissionContext,
} from '@/lib/rbac/hooks';
import { LoadingState } from '@/components/ui/states/loading-state';
import { useAuthStore } from '@/store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  navigation?: keyof typeof NavigationPermissions;
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  permission,
  permissions,
  requireAll = false,
  navigation,
  fallbackPath = '/unauthorized',
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const context = usePermissionContext();

  // Check permissions
  const hasPermission = usePermission(permission!);
  const hasAnyPermissions = useAnyPermission(permissions || []);
  const hasAllPermissions = useAnyPermission(permissions || []); // TODO: Use useAllPermissions when available
  const hasNavigationAccess = useNavigationAccess(navigation!);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isLoading && isAuthenticated && context) {
      let hasAccess = true;

      // Check specific permission
      if (permission && !hasPermission) {
        hasAccess = false;
      }

      // Check any permissions
      if (
        permissions &&
        permissions.length > 0 &&
        !requireAll &&
        !hasAnyPermissions
      ) {
        hasAccess = false;
      }

      // Check all permissions
      if (
        permissions &&
        permissions.length > 0 &&
        requireAll &&
        !hasAllPermissions
      ) {
        hasAccess = false;
      }

      // Check navigation access
      if (navigation && !hasNavigationAccess) {
        hasAccess = false;
      }

      if (!hasAccess) {
        router.push(fallbackPath);
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    context,
    hasPermission,
    hasAnyPermissions,
    hasAllPermissions,
    hasNavigationAccess,
    permission,
    permissions,
    requireAll,
    navigation,
    router,
    fallbackPath,
  ]);

  // Show loading state
  if (isLoading || !isAuthenticated) {
    return loadingComponent || <LoadingState />;
  }

  // Show unauthorized if no context (should not happen if auth is working)
  if (!context) {
    return unauthorizedComponent || <div>Unauthorized</div>;
  }

  // Check permissions again for render
  let hasAccess = true;

  if (permission && !hasPermission) {
    hasAccess = false;
  }

  if (
    permissions &&
    permissions.length > 0 &&
    !requireAll &&
    !hasAnyPermissions
  ) {
    hasAccess = false;
  }

  if (
    permissions &&
    permissions.length > 0 &&
    requireAll &&
    !hasAllPermissions
  ) {
    hasAccess = false;
  }

  if (navigation && !hasNavigationAccess) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return unauthorizedComponent || <div>Unauthorized</div>;
  }

  return <>{children}</>;
}

/**
 * Specialized route protection for admin-only pages
 */
export function AdminRoute({
  children,
  ...props
}: Omit<ProtectedRouteProps, 'permission'>) {
  return (
    <ProtectedRoute permission="system.manage_settings" {...props}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Specialized route protection for club owner/manager pages
 */
export function ClubManagerRoute({
  children,
  ...props
}: Omit<ProtectedRouteProps, 'permissions'>) {
  return (
    <ProtectedRoute
      permissions={['clubs.edit', 'clubs.manage_settings']}
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
}

/**
 * Specialized route protection for navigation-based access
 */
export function NavigationRoute({
  children,
  navigation,
  ...props
}: Omit<ProtectedRouteProps, 'navigation'> & {
  navigation: keyof typeof NavigationPermissions;
}) {
  return (
    <ProtectedRoute navigation={navigation} {...props}>
      {children}
    </ProtectedRoute>
  );
}
