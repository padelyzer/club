import { useRouter, useParams, usePathname } from 'next/navigation';
import { useClubsStore } from '@/store/clubs';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { useCallback } from 'react';

/**
 * Hook to handle navigation within club context
 * Automatically prepends club slug to navigation paths when in club context
 */
export function useClubNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { activeClub } = useActiveClubStore();
  
  const locale = params.locale as string || 'es';
  const currentClubSlug = params['club-slug'] as string;
  // Always ensure we have a valid club slug, never undefined
  const DEFAULT_CLUB = 'api-test-padel-club';
  const clubSlug = (currentClubSlug && currentClubSlug !== 'undefined') 
    ? currentClubSlug 
    : activeClub?.slug || DEFAULT_CLUB;
  
  // Check if we're in a club context
  const isClubContext = !!currentClubSlug || (pathname.split('/')[2] === clubSlug);
  const isRootContext = pathname.includes('/root');
  
  const navigateTo = useCallback((path: string, options?: { replace?: boolean }) => {
    let fullPath = path;
    
    // If path is relative (doesn't start with /), make it absolute
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // If we're in club context and the path doesn't include locale or club slug
    if (isClubContext && !isRootContext && clubSlug) {
      // Check if path already includes locale
      const hasLocale = path.match(/^\/(es|en|fr|de|pt)\//);
      
      if (!hasLocale) {
        // Add locale and club slug
        fullPath = `/${locale}/${clubSlug}${path}`;
      } else if (!path.includes(clubSlug)) {
        // Path has locale but not club slug
        fullPath = path.replace(/^(\/[^\/]+)\//, `$1/${clubSlug}/`);
      } else {
        // Path already has everything
        fullPath = path;
      }
    } else if (!path.match(/^\/(es|en|fr|de|pt)\//)) {
      // Not in club context, just add locale if missing
      fullPath = `/${locale}${path}`;
    } else {
      fullPath = path;
    }
    
    if (options?.replace) {
      router.replace(fullPath);
    } else {
      router.push(fullPath);
    }
  }, [router, locale, clubSlug, isClubContext, isRootContext]);
  
  const switchToClub = useCallback((newClubSlug: string) => {
    // Get current path segments
    const segments = pathname.split('/');
    
    if (currentClubSlug) {
      // Replace current club slug with new one
      const clubIndex = segments.indexOf(currentClubSlug);
      if (clubIndex !== -1) {
        segments[clubIndex] = newClubSlug;
      }
    } else {
      // Insert club slug after locale
      segments.splice(2, 0, newClubSlug);
    }
    
    router.push(segments.join('/'));
  }, [router, pathname, currentClubSlug]);
  
  const switchLanguage = useCallback((newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }, [router, pathname]);
  
  const getEquivalentClubPath = useCallback((genericPath: string, targetClubSlug?: string) => {
    const slug = targetClubSlug || clubSlug;
    if (!slug) return genericPath;
    
    // Map generic paths to club-specific paths
    const pathMapping: Record<string, string> = {
      '/dashboard': `/${locale}/${slug}`,
      '/analytics': `/${locale}/${slug}/analytics`,
      '/reservations': `/${locale}/${slug}/reservations`,
      '/clients': `/${locale}/${slug}/clients`,
      '/courts': `/${locale}/${slug}/courts`,
      '/finance': `/${locale}/${slug}/finance`,
      '/leagues': `/${locale}/${slug}/leagues`,
      '/tournaments': `/${locale}/${slug}/tournaments`,
      '/maintenance': `/${locale}/${slug}/maintenance`,
      '/classes': `/${locale}/${slug}/classes`,
      '/settings': `/${locale}/${slug}/settings`,
    };
    
    // Check if the path needs mapping
    const pathWithoutLocale = genericPath.replace(/^\/(es|en|fr|de|pt)/, '');
    return pathMapping[pathWithoutLocale] || genericPath;
  }, [locale, clubSlug]);
  
  const getGenericPath = useCallback((clubPath: string) => {
    // Remove locale and club slug to get generic path
    const segments = clubPath.split('/');
    
    // Remove empty string, locale, and club slug
    if (segments[0] === '') segments.shift();
    if (segments[0] === locale) segments.shift();
    if (currentClubSlug && segments[0] === currentClubSlug) segments.shift();
    
    // Return generic path
    return `/${locale}/${segments.join('/')}`;
  }, [locale, currentClubSlug]);
  
  return {
    navigateTo,
    switchToClub,
    switchLanguage,
    getEquivalentClubPath,
    getGenericPath,
    isClubContext,
    isRootContext,
    currentClubSlug,
    locale,
  };
}