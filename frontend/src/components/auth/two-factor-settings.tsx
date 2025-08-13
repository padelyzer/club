'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Shield, 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Key, 
  Download,
  AlertTriangle,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthService } from '@/lib/api/services/auth.service';

const phoneSchema = z.object({
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  preferred_method: z.enum(['email', 'sms', 'whatsapp']),
});

const disableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  backup_code: z.string().optional(),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type DisableFormData = z.infer<typeof disableSchema>;

interface TwoFactorSettings {
  is_enabled: boolean;
  backup_codes_count: number;
  phone_number?: string;
  preferred_method: 'email' | 'sms' | 'whatsapp';
}

export function TwoFactorSettings() {
  const [settings, setSettings] = useState<TwoFactorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState<Set<number>>(new Set());

  const setupForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      preferred_method: 'email',
    },
  });

  const disableForm = useForm<DisableFormData>({
    resolver: zodResolver(disableSchema),
  });

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadSettings = async () => {
    try {
      const data = await AuthService.get2FASettings();
      setSettings(data);
    } catch (error) {
      toast.error('Failed to load 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async (data: PhoneFormData) => {
    try {
      const response = await AuthService.enable2FA(data);
      setBackupCodes(response.backup_codes);
      setShowBackupCodes(true);
      setShowSetupModal(false);
      await loadSettings();
      toast.success('Two-factor authentication enabled successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to enable 2FA';
      toast.error(message);
    }
  };

  const handleDisable2FA = async (data: DisableFormData) => {
    try {
      await AuthService.disable2FA(data);
      setShowDisableModal(false);
      await loadSettings();
      toast.success('Two-factor authentication disabled');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to disable 2FA';
      toast.error(message);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      const response = await AuthService.regenerateBackupCodes();
      setBackupCodes(response.backup_codes);
      setShowBackupCodes(true);
      await loadSettings();
      toast.success('Backup codes regenerated');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to regenerate backup codes';
      toast.error(message);
    }
  };

  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => new Set([...prev, index]));
      setTimeout(() => {
        setCopiedCodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 2000);
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'padelyzer-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'sms':
        return 'SMS';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return 'Email';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {settings?.is_enabled ? (
              <ShieldCheck className="h-6 w-6 text-green-600" />
            ) : (
              <Shield className="h-6 w-6 text-muted-foreground" />
            )}
            <div>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${settings?.is_enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              <div>
                <p className="font-medium">
                  {settings?.is_enabled ? 'Enabled' : 'Disabled'}
                </p>
                {settings?.is_enabled && settings.preferred_method && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {getMethodIcon(settings.preferred_method)}
                    {getMethodLabel(settings.preferred_method)}
                    {settings.phone_number && ` • ${settings.phone_number}`}
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={settings?.is_enabled || false}
              onCheckedChange={(checked) => {
                if (checked) {
                  setShowSetupModal(true);
                } else {
                  setShowDisableModal(true);
                }
              }}
            />
          </div>

          {/* Actions Section */}
          {settings?.is_enabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Backup Codes</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.backup_codes_count} codes remaining
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRegenerateBackupCodes}
                >
                  Regenerate
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Backup codes can be used to access your account if you lose access to your 
                  primary 2FA method. Store them securely.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Information Section */}
          {!settings?.is_enabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication adds an extra layer of security by requiring 
                a verification code in addition to your password when signing in.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Setup Modal */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Choose how you'd like to receive verification codes
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={setupForm.handleSubmit(handleEnable2FA)} className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <Select 
                value={setupForm.watch('preferred_method') || ''} 
                onValueChange={(value: 'email' | 'sms' | 'whatsapp') => 
                  setupForm.setValue('preferred_method', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>SMS</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(setupForm.watch('preferred_method') === 'sms' || 
              setupForm.watch('preferred_method') === 'whatsapp') && (
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...setupForm.register('phone_number')}
                />
                {setupForm.formState.errors.phone_number && (
                  <p className="text-sm text-destructive">
                    {setupForm.formState.errors.phone_number.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={setupForm.formState.isSubmitting}
                className="flex-1"
              >
                {setupForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  'Enable 2FA'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowSetupModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable Modal */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password or a backup code to disable 2FA
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={disableForm.handleSubmit(handleDisable2FA)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...disableForm.register('password')}
              />
              {disableForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {disableForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="backup_code">Backup Code (optional)</Label>
              <Input
                id="backup_code"
                type="text"
                placeholder="Enter backup code if you don&apos;t remember your password"
                {...disableForm.register('backup_code')}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Disabling 2FA will make your account less secure. Are you sure you want to continue?
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                variant="destructive"
                disabled={disableForm.formState.isSubmitting}
                className="flex-1"
              >
                {disableForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDisableModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Modal */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
            <DialogDescription>
              Save these codes in a secure location. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
              {backupCodes.map((code, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg font-mono text-sm"
                >
                  <span>{code}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyCode(code, index)}
                    className="h-8 w-8 p-0"
                  >
                    {copiedCodes.has(index) ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadBackupCodes} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowBackupCodes(false)}
              >
                Done
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Keep these codes secure and accessible. You'll need them if you lose access 
                to your primary 2FA method.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}