import { ReactNode, useState } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Package, FileText, Settings, LogOut, Menu, X, UtensilsCrossed, CreditCard, ChartBar as ChartBar, Gift, Calendar, Truck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
}

export function Layout({ children }: LayoutProps) {
  const { staff, business, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: UtensilsCrossed, label: 'Orders', href: '/orders' },
    { icon: ShoppingBag, label: 'Menu', href: '/menu' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: Truck, label: 'Purchasing', href: '/purchasing' },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Calendar, label: 'Reservations', href: '/reservations' },
    { icon: CreditCard, label: 'Billing', href: '/billing' },
    { icon: ChartBar, label: 'Reports', href: '/reports' },
    { icon: Gift, label: 'Loyalty', href: '/loyalty' },
    { icon: Users, label: 'Staff', href: '/staff' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-[#0F1923] text-white transition-all duration-300 min-h-screen fixed left-0 top-0 z-10`}
        >
          <div className="p-4 flex items-center justify-between border-b border-gray-700">
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg">MenuMetrics</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white mx-auto"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {sidebarOpen && business && (
            <div className="p-4 border-b border-gray-700">
              <p className="text-sm font-semibold truncate">{business.name}</p>
              <p className="text-xs text-amber-400 mt-1">Pro Plan</p>
            </div>
          )}

          <nav className="p-2 mt-4">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors mb-1 group"
              >
                <item.icon className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
                {sidebarOpen && (
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                    {item.label}
                  </span>
                )}
              </a>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
            {sidebarOpen && staff && (
              <div className="mb-3">
                <p className="text-sm font-semibold truncate">{staff.name}</p>
                <p className="text-xs text-gray-400">
                  {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                </p>
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors w-full"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
              {sidebarOpen && <span className="text-sm text-gray-300">Sign Out</span>}
            </button>
          </div>
        </aside>

        <main className={`${sidebarOpen ? 'ml-64' : 'ml-20'} flex-1 transition-all duration-300`}>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
