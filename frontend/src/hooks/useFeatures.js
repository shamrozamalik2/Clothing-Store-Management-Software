import { useQuery } from '@tanstack/react-query';
import client from '@api/client';

// Missing means on, matching the backend. The backend enforces access; this only
// decides what to show.
export function useFeatures() {
  const { data } = useQuery({
    queryKey: ['features'],
    queryFn: () => client.get('/features').then(r => r.data.data),
    // Short cache, a refresh when the tab comes back, and a fresh check whenever a page that
    // reads features is freshly opened — so a tab left open across an admin change still catches up.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
  return {
    business_category: data?.business_category,
    isOn: (key) => !key || data?.features?.[key] !== false,
  };
}
