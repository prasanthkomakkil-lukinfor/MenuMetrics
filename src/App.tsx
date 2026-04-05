import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Menu } from './pages/Menu';
import { Kitchen } from './pages/Kitchen';
import { Billing } from './pages/Billing';
import { Reports } from './pages/Reports';
import { Customers } from './pages/Customers';
import { Staff } from './pages/Staff';
import { Inventory } from './pages/Inventory';
import { Loyalty } from './pages/Loyalty';
import { Pricing } from './pages/Pricing';
import { Settings } from './pages/Settings';
import { Reservations } from './pages/Reservations';
import { useEffect, useState } from 'react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const path = window.location.pathname.substring(1) || 'dashboard';
    setCurrentPage(path);
    window.addEventListener('popstate', () => {
      setCurrentPage(window.location.pathname.substring(1) || 'dashboard');
    });
  }, []);

  const navigate = (page: string) => {
    setCurrentPage(page);
    window.history.pushState({}, '', `/${page}`);
  };

  const pageMap: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    orders: <Orders />,
    menu: <Menu />,
    kitchen: <Kitchen />,
    billing: <Billing />,
    reports: <Reports />,
    customers: <Customers />,
    staff: <Staff />,
    inventory: <Inventory />,
    loyalty: <Loyalty />,
    reservations: <Reservations />,
    pricing: <Pricing />,
    settings: <Settings />,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return pageMap[currentPage] || <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
