import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Layout } from './components/Layout';
import { Toaster } from './components/Toaster';
import { CookieConsent } from './components/CookieConsent';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { Spinner } from './components/ui';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Terms, Privacy } from './pages/Legal';
import { Dashboard } from './pages/Dashboard';
import { CreateProject } from './pages/CreateProject';
import { ProjectDetail } from './pages/ProjectDetail';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Account } from './pages/Account';
import { Analytics } from './pages/Analytics';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready)
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const { bootstrap, ready, user } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <>
      <Routes>
        <Route path="/login" element={user && ready ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user && ready ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<CreateProject />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account" element={<Account />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AnalyticsTracker />
      <Toaster />
      <CookieConsent />
    </>
  );
}
