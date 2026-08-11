import { ReactNode, useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Package, FileText, Settings, LogOut, Menu, X, UtensilsCrossed, CreditCard, ChartBar as ChartBar, Gift, Calendar, Truck, Store, ChevronDown, Check, ChefHat } from 'lucide-react';
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
  const { staff, business, brand, branches, activeBranchId, isAllBranches, switchBranch, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: UtensilsCrossed, label: 'Orders', href: '/orders' },
    { icon: ShoppingBag, label: 'Menu', href: '/menu' },
    { icon: ChefHat, label: 'Recipes', href: '/recipes' },
    { icon: Package, label: 'Inventory', href: '/inventory' },
    { icon: Truck, label: 'Purchasing', href: '/purchasing' },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Calendar, label: 'Reservations', href: '/reservations' },
    { icon: CreditCard, label: 'Billing', href: '/billing' },
    { icon: ChartBar, label: 'Reports', href: '/reports' },
    { icon: Gift, label: 'Loyalty', href: '/loyalty' },
    { icon: Users, label: 'Staff', href: '/staff' },
    { icon: Store, label: 'Branches', href: '/branches' },
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

          {sidebarOpen && (
            <div className="p-4 border-b border-gray-700">
              {brand && branches.length > 1 ? (
                <p className="text-sm font-semibold truncate">{brand.name}</p>
              ) : business ? (
                <>
                  <p className="text-sm font-semibold truncate">{business.name}</p>
                  <p className="text-xs text-amber-400 mt-1">Pro Plan</p>
                </>
              ) : null}
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
          {/* Branch switcher header bar */}
          {brand && branches.length > 1 && (
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
              <div className="relative" ref={branchDropdownRef}>
                <button
                  onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
                >
                  <Store className="w-4 h-4 text-amber-500" />
                  <span>{isAllBranches ? 'All Branches' : business?.branch_name || business?.name || 'Select Branch'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {branchDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                    <button
                      onClick={() => { switchBranch(null); setBranchDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        isAllBranches ? 'text-amber-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>All Branches (Aggregate)</span>
                      {isAllBranches && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                    <div className="border-t border-gray-100" />
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { switchBranch(b.id); setBranchDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                          activeBranchId === b.id ? 'text-amber-600 font-semibold' : 'text-gray-700'
                        }`}
                      >
                        <Store className="w-4 h-4 flex-shrink-0" />
                        <div className="text-left overflow-hidden">
                          <p className="truncate">{b.branch_name || b.name}</p>
                          {b.city && <p className="text-xs text-gray-400">{b.city}</p>}
                        </div>
                        {activeBranchId === b.id && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isAllBranches && (
                <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium">
                  Viewing aggregated data across {branches.length} branches
                </span>
              )}
            </div>
          )}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
