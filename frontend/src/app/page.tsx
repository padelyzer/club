import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';

export default function Home() {
  return (
    <div className="min-h-screen safe-area-padding">
      {/* Header */}
      <header className="glass-effect border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gradient">Padelyzer</h1>
            <div className="flex items-center space-x-4">
              <Badge variant="success">Online</Badge>
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Welcome to Padelyzer
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Advanced padel analytics and club management platform with
              Apple-inspired design
            </p>
          </div>

          {/* Demo Components Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Buttons Card */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Button Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button className="w-full">Primary Button</Button>
                  <Button variant="secondary" className="w-full">
                    Secondary Button
                  </Button>
                  <Button variant="outline" className="w-full">
                    Outline Button
                  </Button>
                  <Button variant="ghost" className="w-full">
                    Ghost Button
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Form Components Card */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Form Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Enter your email" />
                <Input placeholder="Search matches..." />
                <Input placeholder="Player name" error />
                <Button variant="default" className="w-full">
                  Submit
                </Button>
              </CardContent>
            </Card>

            {/* Badges Card */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Status Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Active</Badge>
                  <Badge variant="success">Won</Badge>
                  <Badge variant="warning">Pending</Badge>
                  <Badge variant="destructive">Error</Badge>
                  <Badge variant="secondary">Draft</Badge>
                  <Badge variant="outline">Neutral</Badge>
                </div>
                <LoadingSpinner className="mx-auto" />
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Match Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Matches Played
                    </span>
                    <span className="font-semibold">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Win Rate
                    </span>
                    <span className="font-semibold text-success-600">73%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Ranking
                    </span>
                    <span className="font-semibold">#12</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ace Percentage</span>
                    <Badge variant="success">12%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Error Rate</span>
                    <Badge variant="warning">8%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">First Serve</span>
                    <Badge variant="default">68%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  📊 View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  🏆 Start Tournament
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  👥 Manage Players
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              Padelyzer Frontend - Apple-inspired Design System with Next.js 14
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
