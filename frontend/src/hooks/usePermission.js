import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@store/slices/authSlice';

/**
 * Returns helpers for checking what the current user can do.
 *
 * Usage:
 *   const { can, isAdmin } = usePermission();
 *   can('products', 'create')  // true/false
 *   isAdmin                    // true/false
 */
export function usePermission() {
  const user = useSelector(selectCurrentUser);
  const isAdmin = user?.role === 'admin';
  const permissions = user?.permissions || {};

  function can(module, action = 'view') {
    if (!user) return false;
    if (isAdmin) return true;
    const mod = permissions[module];
    if (mod === true) return true;
    if (typeof mod === 'object' && mod !== null) return mod[action] === true;
    return false;
  }

  return { can, isAdmin, role: user?.role };
}
