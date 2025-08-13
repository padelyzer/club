import React from 'react';
import { Permission } from '@/lib/rbac/permissions';
import {
  usePermission,
  useAnyPermission,
  useAllPermissions,
  useResourceAccess,
  useActionPermission,
} from '@/lib/rbac/hooks';

interface BaseProtectedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

interface PermissionProtectedProps extends BaseProtectedProps {
  permission: Permission;
}

interface AnyPermissionProtectedProps extends BaseProtectedProps {
  permissions: Permission[];
}

interface AllPermissionsProtectedProps extends BaseProtectedProps {
  permissions: Permission[];
}

interface ResourceProtectedProps extends BaseProtectedProps {
  resource: {
    type: string;
    id: number;
    club_id?: number;
    owner_id?: string;
  };
  permission: Permission;
}

interface ActionProtectedProps extends BaseProtectedProps {
  action: string;
  resource?: {
    type: string;
    id: number;
    club_id?: number;
    owner_id?: string;
  };
}

/**
 * Component that renders children only if user has the specified permission
 */
export function ProtectedComponent({
  permission,
  children,
  fallback = null,
  showFallback = false,
}: PermissionProtectedProps) {
  const hasAccess = usePermission(permission);

  if (!hasAccess) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only if user has any of the specified permissions
 */
export function AnyPermissionProtected({
  permissions,
  children,
  fallback = null,
  showFallback = false,
}: AnyPermissionProtectedProps) {
  const hasAccess = useAnyPermission(permissions);

  if (!hasAccess) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only if user has all of the specified permissions
 */
export function AllPermissionsProtected({
  permissions,
  children,
  fallback = null,
  showFallback = false,
}: AllPermissionsProtectedProps) {
  const hasAccess = useAllPermissions(permissions);

  if (!hasAccess) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only if user can access the specified resource
 */
export function ResourceProtected({
  resource,
  permission,
  children,
  fallback = null,
  showFallback = false,
}: ResourceProtectedProps) {
  const hasAccess = useResourceAccess(resource, permission);

  if (!hasAccess) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only if user can perform the specified action
 */
export function ActionProtected({
  action,
  resource,
  children,
  fallback = null,
  showFallback = false,
}: ActionProtectedProps) {
  const hasAccess = useActionPermission(action as any, resource);

  if (!hasAccess) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for protecting components with permissions
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ComponentType
) {
  return function ProtectedWrapper(props: P) {
    const hasAccess = usePermission(permission);

    if (!hasAccess) {
      return fallback ? React.createElement(fallback, props) : null;
    }

    return React.createElement(Component, props);
  };
}

/**
 * Higher-order component for protecting components with any permission
 */
export function withAnyPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: Permission[],
  fallback?: React.ComponentType
) {
  return function ProtectedWrapper(props: P) {
    const hasAccess = useAnyPermission(permissions);

    if (!hasAccess) {
      return fallback ? React.createElement(fallback, props) : null;
    }

    return React.createElement(Component, props);
  };
}

/**
 * Higher-order component for protecting components with resource access
 */
export function withResourceAccess<P extends object>(
  Component: React.ComponentType<P>,
  getResource: (props: P) => {
    type: string;
    id: number;
    club_id?: number;
    owner_id?: string;
  },
  permission: Permission,
  fallback?: React.ComponentType
) {
  return function ProtectedWrapper(props: P) {
    const resource = getResource(props);
    const hasAccess = useResourceAccess(resource, permission);

    if (!hasAccess) {
      return fallback ? React.createElement(fallback, props) : null;
    }

    return React.createElement(Component, props);
  };
}
