import { useAuth } from '@/lib/api/hooks/useAuth';
import { useParams } from 'next/navigation';
import { useClubs } from '@/lib/api/hooks/useClubs';

export function useActiveClub() {
  const { user } = useAuth();
  const params = useParams();
  const clubSlug = params['club-slug'] as string;
  
  // Get all clubs to find the active one
  const { data: clubsData } = useClubs({ 
    page_size: 100,
    is_active: true 
  });
  
  const clubs = clubsData?.results || [];
  
  // Try to find club by slug from URL
  const activeClub = clubs.find(club => club.slug === clubSlug);
  
  // Fallback to user's primary club or first available club
  const defaultClub = user?.club || clubs[0];
  
  return {
    activeClub: activeClub || defaultClub,
    clubId: (activeClub || defaultClub)?.id,
    isLoading: !clubsData,
    clubs,
  };
}