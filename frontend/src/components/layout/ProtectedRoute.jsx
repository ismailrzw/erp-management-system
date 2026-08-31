import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Preloader } from '../ui/Preloader';

export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Preloader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
