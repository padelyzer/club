'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Smartphone, 
  Monitor, 
  Tablet, 
  MapPin, 
  Clock, 
  AlertTriangle,
  LogOut,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AuthService } from '@/lib/api/services/auth.service';

interface DeviceSession {
  id: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: {
    city: string;
    country: string;
    region?: string;
  };
  is_current: boolean;
  is_trusted: boolean;
  last_activity: string;
  created_at: string;
}

interface SessionSettings {
  auto_logout_minutes: number;
  max_concurrent_sessions: number;
  require_device_trust: boolean;
  notify_new_devices: boolean;
}

export function SessionSecurity() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [settings, setSettings] = useState<SessionSettings | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockSessions: DeviceSession[] = [
        {
          id: '1',
          device_type: 'desktop',
          device_name: 'MacBook Pro',
          browser: 'Chrome 120',
          os: 'macOS',
          ip_address: '192.168.1.100',
          location: {
            city: 'Mexico City',
            country: 'Mexico',
            region: 'CDMX'
          },
          is_current: true,
          is_trusted: true,
          last_activity: '2025-01-15T14:30:00Z',
          created_at: '2025-01-15T08:00:00Z'
        },
        {
          id: '2',
          device_type: 'mobile',
          device_name: 'iPhone 15',
          browser: 'Safari 17',
          os: 'iOS 17',
          ip_address: '10.0.0.50',
          location: {
            city: 'Guadalajara',
            country: 'Mexico',
            region: 'Jalisco'
          },
          is_current: false,
          is_trusted: false,
          last_activity: '2025-01-15T12:00:00Z',
          created_at: '2025-01-15T10:00:00Z'
        }
      ];

      setSessions(mockSessions);
      setSettings({
        auto_logout_minutes: 30,
        max_concurrent_sessions: 5,
        require_device_trust: true,
        notify_new_devices: true
      });
    } catch (error) {
      toast.error('Error loading session data');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevoking(prev => new Set(prev).add(sessionId));
      await AuthService.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked successfully');
    } catch (error) {
      toast.error('Error revoking session');
    } finally {
      setRevoking(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      const otherSessions = sessions.filter(s => !s.is_current);
      setRevoking(new Set(otherSessions.map(s => s.id)));
      
      await Promise.all(otherSessions.map(s => AuthService.revokeSession(s.id)));
      setSessions(prev => prev.filter(s => s.is_current));
      
      toast.success('All other sessions revoked');
    } catch (error) {
      toast.error('Error revoking sessions');
    } finally {
      setRevoking(new Set());
    }
  };

  const handleTrustDevice = async (sessionId: string, trust: boolean) => {
    try {
      await AuthService.trustDevice(sessionId, trust);
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, is_trusted: trust } : s
      ));
      toast.success(`Device ${trust ? 'trusted' : 'untrusted'} successfully`);
    } catch (error) {
      toast.error('Error updating device trust');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  const untrustedSessions = sessions.filter(session => !session.is_trusted);
  const suspiciousSessions = sessions.filter(session =>
    !session.is_trusted && 
    new Date(session.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Session Security</CardTitle>
              <CardDescription>
                Monitor and manage your active sessions and devices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Alerts */}
          {suspiciousSessions.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Alert:</strong> {suspiciousSessions.length} new untrusted device
                {suspiciousSessions.length > 1 ? 's' : ''} detected. Review and trust or revoke access.
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {sessions.filter(s => s.is_trusted).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Trusted Devices</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-600">{untrustedSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Untrusted Devices</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {sessions.filter(s => !s.is_current).length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRevokeAllOthers}
                disabled={revoking.size > 0}
              >
                {revoking.size > 0 ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Revoke All Other Sessions
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Devices and locations where you're currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    {getDeviceIcon(session.device_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{session.device_name}</p>
                      {session.is_current && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                      {session.is_trusted && (
                        <Badge variant="default" className="text-xs">Trusted</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.browser} • {session.os}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{session.location.city}, {session.location.country}</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{formatLastActivity(session.last_activity)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!session.is_current && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTrustDevice(session.id, !session.is_trusted)}
                      >
                        {session.is_trusted ? 'Untrust' : 'Trust'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revoking.has(session.id)}
                      >
                        {revoking.has(session.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}