'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Edit,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { EmployeeSchedule } from '@/components/employees/employee-schedule';
import {
  useEmployee,
  useActivateEmployee,
  useDeactivateEmployee,
} from '@/lib/api/hooks/useEmployees';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EmployeeDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const clubId = params.clubId as string;
  const employeeId = params.id as string;

  const { data: employee, isLoading, error } = useEmployee(clubId, employeeId);
  const activateEmployee = useActivateEmployee(clubId);
  const deactivateEmployee = useDeactivateEmployee(clubId);

  const handleToggleStatus = async () => {
    if (employee?.is_active) {
      await deactivateEmployee.mutateAsync(employeeId);
    } else {
      await activateEmployee.mutateAsync(employeeId);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'instructor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'receptionist':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'manager':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !employee) {
    return <ErrorState message={t('employees.errorLoadingEmployee')} />;
  }

  // Calculate tenure
  const hireDate = new Date(employee.hire_date);
  const today = new Date();
  const tenureYears = today.getFullYear() - hireDate.getFullYear();
  const tenureMonths =
    today.getMonth() - hireDate.getMonth() + tenureYears * 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/clubs/${clubId}/employees`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {employee.first_name} {employee.last_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={getRoleBadgeColor(employee.role)}>
                {t(`employees.roles.${employee.role}`)}
              </Badge>
              <Badge variant={employee.is_active ? 'success' : 'secondary'}>
                {employee.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {employee.employee_code}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleStatus}
            disabled={
              activateEmployee.isPending || deactivateEmployee.isPending
            }
          >
            {employee.is_active ? (
              <>
                <UserX className="w-4 h-4 mr-2" />
                {t('employees.deactivate')}
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                {t('employees.activate')}
              </>
            )}
          </Button>
          <Button
            onClick={() =>
              router.push(`/clubs/${clubId}/employees/${employeeId}/edit`)
            }
          >
            <Edit className="w-4 h-4 mr-2" />
            {t('common.edit')}
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('employees.email')}
                </p>
                <p className="font-medium">{employee.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('employees.phone')}
                </p>
                <p className="font-medium">{employee.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('employees.tenure')}
                </p>
                <p className="font-medium">
                  {tenureMonths >= 12
                    ? t('employees.tenureYears', {
                        years: Math.floor(tenureMonths / 12),
                      })
                    : t('employees.tenureMonths', { months: tenureMonths })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">{t('employees.schedule')}</TabsTrigger>
          <TabsTrigger value="personal">
            {t('employees.personalInfo')}
          </TabsTrigger>
          <TabsTrigger value="certifications">
            {t('employees.certifications')}
          </TabsTrigger>
          <TabsTrigger value="activity">{t('employees.activity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <EmployeeSchedule
            clubId={clubId}
            employeeId={employeeId}
            employeeName={`${employee.first_name} ${employee.last_name}`}
            employeeRole={employee.role}
          />
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('employees.personalInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('employees.fullName')}
                  </p>
                  <p className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </p>
                </div>

                {employee.birth_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('employees.birthDate')}
                    </p>
                    <p className="font-medium">
                      {format(
                        new Date(employee.birth_date),
                        "d 'de' MMMM, yyyy",
                        { locale: es }
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('employees.hireDate')}
                  </p>
                  <p className="font-medium">
                    {format(new Date(employee.hire_date), "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
                  </p>
                </div>

                {employee.document_type && employee.document_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('employees.document')}
                    </p>
                    <p className="font-medium">
                      {t(`employees.documentTypes.${employee.document_type}`)}:{' '}
                      {employee.document_number}
                    </p>
                  </div>
                )}
              </div>

              {employee.address && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {t('employees.address')}
                  </p>
                  <p className="font-medium">{employee.address}</p>
                </div>
              )}

              {employee.skills && employee.skills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('employees.skills')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {employee.emergency_contact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-destructive" />
                  {t('employees.emergencyContact')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('employees.emergency.name')}
                    </p>
                    <p className="font-medium">
                      {employee.emergency_contact.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('employees.emergency.phone')}
                    </p>
                    <p className="font-medium">
                      {employee.emergency_contact.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('employees.emergency.relationship')}
                    </p>
                    <p className="font-medium">
                      {employee.emergency_contact.relationship}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="certifications">
          <Card>
            <CardHeader>
              <CardTitle>{t('employees.certifications')}</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.certifications && employee.certifications.length > 0 ? (
                <div className="space-y-4">
                  {employee.certifications.map((cert) => (
                    <div key={cert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{cert.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {cert.issuer}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>
                              {t('employees.issued')}:{' '}
                              {format(new Date(cert.issue_date), 'MMM yyyy', {
                                locale: es,
                              })}
                            </span>
                            {cert.expiry_date && (
                              <span>
                                {t('employees.expires')}:{' '}
                                {format(
                                  new Date(cert.expiry_date),
                                  'MMM yyyy',
                                  { locale: es }
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {cert.document_url && (
                          <Button variant="outline" size="sm">
                            {t('common.viewDocument')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t('employees.noCertifications')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>{t('employees.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                {t('employees.noActivity')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
