'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, 
  Zap, 
  AlertTriangle, 
  Check, 
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { useApiVersion, useVersionMigration } from '@/hooks/use-api-version';
import { ApiVersion } from '@/lib/api/versioning';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VERSION_INFO: Record<ApiVersion, {
  label: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  badge?: string;
}> = {
  [ApiVersion.V1]: {
    label: 'API v1 (Stable)',
    description: 'Current stable version with core features',
    features: [
      'Basic authentication',
      'Court reservations',
      'Client management',
      'Standard analytics',
    ],
    icon: <Code2 className="h-5 w-5" />,
  },
  [ApiVersion.V2]: {
    label: 'API v2 (Beta)',
    description: 'Next generation API with advanced features',
    features: [
      'OAuth authentication',
      'Real-time updates',
      'Smart booking AI',
      'Advanced analytics',
      'ML predictions',
    ],
    icon: <Zap className="h-5 w-5" />,
    badge: 'BETA',
  },
};

export function ApiVersionSwitcher() {
  const { currentVersion, availableVersions, switchVersion, features } = useApiVersion();
  const { migrationStatus, migrationProgress, migrateToVersion } = useVersionMigration();
  const [selectedVersion, setSelectedVersion] = useState<ApiVersion | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleVersionChange = async (version: ApiVersion) => {
    if (version === currentVersion) return;
    
    setSelectedVersion(version);
    
    // For major version changes, use migration
    if (version === ApiVersion.V2 && currentVersion === ApiVersion.V1) {
      await migrateToVersion(version);
    } else {
      switchVersion(version);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">API Version</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose the API version for your application. Newer versions offer more features but may be less stable.
        </p>
      </div>

      <div className="space-y-3">
        {availableVersions.map((version) => {
          const info = VERSION_INFO[version];
          const isActive = version === currentVersion;
          const isSelected = version === selectedVersion;
          
          return (
            <motion.div
              key={version}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <button
                onClick={() => handleVersionChange(version)}
                disabled={migrationStatus === 'migrating'}
                className={cn(
                  'w-full text-left p-4 rounded-lg border transition-all',
                  isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                  isSelected && 'ring-2 ring-blue-500'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}>
                      {info.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{info.label}</h4>
                        {info.badge && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded">
                            {info.badge}
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  
                  <ChevronRight className={cn(
                    'h-5 w-5 text-gray-400 transition-transform',
                    showDetails && isActive && 'transform rotate-90'
                  )} />
                </div>
                
                {showDetails && isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-2"
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Active features:</strong>
                    </div>
                    <ul className="text-sm space-y-1">
                      {info.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {migrationStatus === 'migrating' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium">Migrating to API v2...</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(migrationProgress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600"
                  animate={{ width: `${migrationProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {migrationStatus === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Migration completed successfully!</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Reloading page to apply changes...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {migrationStatus === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium">Migration failed</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Please try again or contact support if the issue persists.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-gray-500 mt-0.5" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">About API versions</p>
            <p>
              API v2 is currently in beta and includes experimental features. 
              While it offers advanced capabilities, some features may change before the stable release. 
              We recommend using v1 for production environments.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'Show'} feature details
        </Button>
        
        {currentVersion !== ApiVersion.V2 && (
          <Button
            size="sm"
            onClick={() => window.open('/docs/api/v2', '_blank')}
          >
            Learn about v2
          </Button>
        )}
      </div>
    </div>
  );
}