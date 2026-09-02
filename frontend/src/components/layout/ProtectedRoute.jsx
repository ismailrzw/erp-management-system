import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Preloader } from '../ui/Preloader';

export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Preloader />;
  }

  // Check fallback storage in case state update is settling during navigation
  const effectiveUser =
    user ||
    (() => {
      try {
        const stored = localStorage.getItem('pbl_user') || sessionStorage.getItem('pbl_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();

  const effectiveToken =
    token || localStorage.getItem('pbl_token') || sessionStorage.getItem('pbl_token');

  const isAuthed = isAuthenticated || (!!effectiveToken && !!effectiveUser);

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(effectiveUser?.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

