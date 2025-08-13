'use client';

import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Club } from '@/types/club';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

interface ClubAnalyticsDashboardProps {
  club: Club;
}

export function ClubAnalyticsDashboard({ club }: ClubAnalyticsDashboardProps) {
  const { t } = useTranslation();

  const stats = [
    {
      title: t('analytics.totalReservations'),
      value: '1,234',
      change: '+12.5%',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      title: t('analytics.activeMembers'),
      value: '456',
      change: '+5.2%',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: t('analytics.monthlyRevenue'),
      value: '$12,345',
      change: '+8.4%',
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      title: t('analytics.occupancyRate'),
      value: '78%',
      change: '+3.1%',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('analytics.clubAnalytics')}</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-sm text-green-600 mt-1">{stat.change}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('analytics.revenueChart')}</h3>
          <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded flex items-center justify-center">
            <p className="text-muted-foreground">{t('analytics.chartPlaceholder')}</p>
          </div>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('analytics.occupancyChart')}</h3>
          <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded flex items-center justify-center">
            <p className="text-muted-foreground">{t('analytics.chartPlaceholder')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}