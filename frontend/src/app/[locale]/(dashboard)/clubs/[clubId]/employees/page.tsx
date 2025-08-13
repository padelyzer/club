'use client';

import { useParams } from 'next/navigation';
import { EmployeesList } from '@/components/employees/employees-list';

export default function ClubEmployeesPage() {
  const params = useParams();
  const clubId = params.clubId as string;

  return <EmployeesList clubId={clubId} />;
}
