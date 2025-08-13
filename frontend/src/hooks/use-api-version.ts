import { useState, useEffect, useCallback } from 'react';
import { 
  ApiVersion, 
  apiVersionManager, 
  isFeatureAvailable,
  VERSION_FEATURES,
  getCurrentApiVersion,
  setApiVersion
} from '@/lib/api/versioning';

interface UseApiVersionReturn {
  currentVersion: ApiVersion;
  availableVersions: ApiVersion[];
  features: string[];
  switchVersion: (version: ApiVersion) => void;
  isFeatureAvailable: (feature: string) => boolean;
  isLatestVersion: boolean;
}

/**
 * Hook for managing API versioning
 */
export function useApiVersion(): UseApiVersionReturn {
  const [currentVersion, setCurrentVersion] = useState<ApiVersion>(getCurrentApiVersion());
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    // Load version from localStorage
    const savedVersion = localStorage.getItem('api-version') as ApiVersion;
    if (savedVersion && Object.values(ApiVersion).includes(savedVersion)) {
      setApiVersion(savedVersion);
      setCurrentVersion(savedVersion);
    }
    
    // Update features
    setFeatures(VERSION_FEATURES[currentVersion] || []);
  }, [currentVersion]);

  const switchVersion = useCallback((version: ApiVersion) => {
    setApiVersion(version);
    setCurrentVersion(version);
    localStorage.setItem('api-version', version);
    
    // Reload the page to ensure all components use the new version
    if (window.confirm('Switching API version requires a page reload. Continue?')) {
      window.location.reload();
    }
  }, []);

  const checkFeature = useCallback((feature: string) => {
    return isFeatureAvailable(feature, currentVersion);
  }, [currentVersion]);

  const availableVersions = Object.values(ApiVersion);
  const isLatestVersion = currentVersion === ApiVersion.V2;

  return {
    currentVersion,
    availableVersions,
    features,
    switchVersion,
    isFeatureAvailable: checkFeature,
    isLatestVersion,
  };
}

/**
 * Hook for version-specific components
 */
export function useVersionedComponent<T = any>(
  componentMap: Record<ApiVersion, T>
): T | null {
  const { currentVersion } = useApiVersion();
  return componentMap[currentVersion] || null;
}

/**
 * Hook for version migration
 */
export function useVersionMigration() {
  const { currentVersion } = useApiVersion();
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'completed' | 'failed'>('idle');
  const [migrationProgress, setMigrationProgress] = useState(0);

  const migrateToVersion = useCallback(async (targetVersion: ApiVersion) => {
    if (targetVersion === currentVersion) {
      return;
    }

    setMigrationStatus('migrating');
    setMigrationProgress(0);

    try {
      // Simulate migration steps
      const steps = [
        'Backing up current data',
        'Checking compatibility',
        'Migrating user preferences',
        'Updating API endpoints',
        'Verifying migration',
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setMigrationProgress((i + 1) / steps.length * 100);
      }

      // Switch to new version
      setApiVersion(targetVersion);
      localStorage.setItem('api-version', targetVersion);
      setMigrationStatus('completed');

      // Reload after short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMigrationStatus('failed');
          }
  }, [currentVersion]);

  return {
    migrationStatus,
    migrationProgress,
    migrateToVersion,
  };
}

/**
 * Hook for feature flags based on API version
 */
export function useVersionFeatureFlag(feature: string): boolean {
  const { isFeatureAvailable } = useApiVersion();
  return isFeatureAvailable(feature);
}

/**
 * Hook for version-aware API endpoints
 */
export function useVersionedEndpoint(endpoint: string, params?: Record<string, string>) {
  const [versionedEndpoint, setVersionedEndpoint] = useState('');
  
  useEffect(() => {
    const versioned = apiVersionManager.getVersionedEndpoint(endpoint, params);
    setVersionedEndpoint(versioned);
  }, [endpoint, params]);

  return versionedEndpoint;
}