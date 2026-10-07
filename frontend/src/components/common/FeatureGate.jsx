import { useFeatures } from '@hooks/useFeatures';
import { FEATURE_LABELS } from '@config/featureRoutes';
import ModuleDisabled from './ModuleDisabled';

// Wraps a route's page. Shows a clear message instead of the page when its module is off,
// so opening it directly (a bookmark, a stale nav item, or a direct link) never looks like a
// broken empty page — the same answer the backend already gives the API calls underneath it.
export default function FeatureGate({ feature, children }) {
  const { isOn } = useFeatures();
  if (!feature || isOn(feature)) return children;
  return <ModuleDisabled label={FEATURE_LABELS[feature] || feature} />;
}
