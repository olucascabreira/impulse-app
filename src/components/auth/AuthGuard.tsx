import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user && location.pathname !== '/auth') {
        navigate('/auth');
      } else if (user && location.pathname === '/auth') {
        navigate('/');
      }
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user && location.pathname !== '/auth') {
    return null;
  }

  return <>{children}</>;
}