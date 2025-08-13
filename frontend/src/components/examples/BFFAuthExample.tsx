/**
 * BFF Auth Context Usage Example
 * 
 * This component demonstrates how to use the new BFF auth context
 * in a real-world scenario with backward compatibility.
 */

import React from 'react';
import { useAuth, useAuthContext, usePermissions } from '@/lib/api/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function BFFAuthExample() {
  // Legacy auth hook (still works)
  const { isAuthenticated, login, logout } = useAuth();

  // New BFF context hook
  const {
    user,
    organization,
    clubs,
    session,
    isBFFEnabled,
    isBFFAvailable,
    hasFeature,
    isSubscriptionActive,
    isSessionExpiring,
  } = useAuthContext();

  // Permission utilities
  const {
    can,
    canManageUsers,
    canViewAnalytics,
    isOwner,
    isManager,
  } = usePermissions();

  if (!isAuthenticated) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
        <Button onClick={() => login({ email: 'demo@example.com', password: 'demo' })}>
          Login with Demo Account
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* BFF Status Indicator */}
      <Alert>
        <AlertDescription>
          BFF Auth Context: {isBFFEnabled ? '✅ Enabled' : '❌ Disabled'} | 
          Available: {isBFFAvailable ? '✅ Yes' : '❌ No'}
        </AlertDescription>
      </Alert>

      {/* User Information */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">User Profile</h2>
        {user && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold">Name:</label>
              <p>{user.first_name} {user.last_name}</p>
            </div>
            <div>
              <label className="font-semibold">Email:</label>
              <p>{user.email}</p>
            </div>
            <div>
              <label className="font-semibold">Status:</label>
              <Badge variant={user.is_active ? 'default' : 'destructive'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Organization Information (BFF Only) */}
      {organization && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Organization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold">Trade Name:</label>
              <p>{organization.trade_name}</p>
            </div>
            <div>
              <label className="font-semibold">Business Name:</label>
              <p>{organization.business_name}</p>
            </div>
            <div>
              <label className="font-semibold">Type:</label>
              <Badge>{organization.type}</Badge>
            </div>
            <div>
              <label className="font-semibold">State:</label>
              <Badge variant={organization.state === 'active' ? 'default' : 'secondary'}>
                {organization.state}
              </Badge>
            </div>
          </div>

          {/* Subscription Information */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Subscription</h3>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{organization.subscription.plan}</Badge>
              <Badge variant={isSubscriptionActive() ? 'default' : 'destructive'}>
                {isSubscriptionActive() ? 'Active' : 'Expired'}
              </Badge>
            </div>
            <div className="mt-2">
              <label className="font-semibold">Features:</label>
              <div className="flex gap-2 mt-1">
                {organization.subscription.features.map(feature => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Clubs Information (BFF Only) */}
      {clubs && clubs.length > 0 && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Your Clubs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clubs.map(club => (
              <div key={club.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold">{club.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={isOwner(club.id) ? 'default' : 'secondary'}>
                    {club.role}
                  </Badge>
                  {isOwner(club.id) && <Badge variant="outline">Owner Access</Badge>}
                  {isManager(club.id) && <Badge variant="outline">Manager Access</Badge>}
                </div>
                <div className="mt-2">
                  <label className="text-sm font-medium">Permissions:</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {club.permissions.map(permission => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Permission Examples */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Permission-Based UI</h2>
        <div className="space-y-4">
          {canManageUsers() && (
            <Alert>
              <AlertDescription>
                ✅ You have permission to manage users globally
              </AlertDescription>
            </Alert>
          )}

          {canViewAnalytics() && (
            <Alert>
              <AlertDescription>
                ✅ You can view analytics dashboard
              </AlertDescription>
            </Alert>
          )}

          {clubs?.map(club => (
            <div key={club.id} className="p-3 border rounded">
              <h4 className="font-medium">{club.name} Permissions:</h4>
              <div className="mt-2 space-y-1">
                {can('manage_reservations', club.id) && (
                  <p className="text-sm text-green-600">✅ Can manage reservations</p>
                )}
                {can('view_finance', club.id) && (
                  <p className="text-sm text-green-600">✅ Can view finances</p>
                )}
                {!can('manage_reservations', club.id) && (
                  <p className="text-sm text-gray-500">❌ Cannot manage reservations</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Session Information (BFF Only) */}
      {session && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Session Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold">Expires At:</label>
              <p>{new Date(session.expires_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="font-semibold">Last Activity:</label>
              <p>{new Date(session.last_activity).toLocaleString()}</p>
            </div>
            <div>
              <label className="font-semibold">Multi-Factor:</label>
              <Badge variant={session.multi_factor_enabled ? 'default' : 'secondary'}>
                {session.multi_factor_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div>
              <label className="font-semibold">Session Status:</label>
              <Badge variant={isSessionExpiring() ? 'destructive' : 'default'}>
                {isSessionExpiring() ? 'Expiring Soon' : 'Active'}
              </Badge>
            </div>
          </div>

          {isSessionExpiring() && (
            <Alert className="mt-4">
              <AlertDescription>
                ⚠️ Your session will expire soon. Please save your work.
              </AlertDescription>
            </Alert>
          )}
        </Card>
      )}

      {/* Feature-Based UI */}
      {organization && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Feature-Based Components</h2>
          <div className="space-y-4">
            {hasFeature('analytics') && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">Advanced Analytics</h3>
                <p className="text-blue-700">Premium analytics dashboard available</p>
              </div>
            )}

            {hasFeature('multi_club') && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900">Multi-Club Management</h3>
                <p className="text-green-700">Manage multiple clubs from one account</p>
              </div>
            )}

            {!hasFeature('analytics') && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Basic Features Only</h3>
                <p className="text-gray-700">Upgrade to access advanced analytics</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Actions</h2>
        <div className="flex gap-4">
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Refresh Context
          </Button>
          <Button 
            onClick={logout} 
            variant="destructive"
          >
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default BFFAuthExample;