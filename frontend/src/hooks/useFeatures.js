import { useQuery } from '@tanstack/react-query';
import client from '@api/client';

// Missing means on, matching the backend. The backend enforces access; this only
// decides what to show.
export function useFeatures() {
  const { data } = useQuery({
    queryKey: ['features'],
    queryFn: () => client.get('/features').then(r => r.data.data),
    // Short cache, and a refresh when the tab comes back, so admin changes show up without a reload.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  return {
    business_category: data?.business_category,
    isOn: (key) => !key || data?.features?.[key] !== false,
  };
}
