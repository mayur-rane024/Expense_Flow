import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, CheckSquare, Settings, LogOut,
  Zap, Users, GitBranch, ChevronRight, Bell
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = {
    EMPLOYEE: [
      { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },
    ],
    MANAGER: [
      { to: '/manager', label: 'Approvals', icon: CheckSquare },
      { to: '/employee', label: 'My Expenses', icon: FileText },
    ],
    ADMIN: [
      { to: '/admin', label: 'Admin Panel', icon: Settings },
      { to: '/manager', label: 'Approvals', icon: CheckSquare },
      { to: '/employee', label: 'My Expenses', icon: FileText },
    ],
  };

  const links = navLinks[user?.role] || [];
  const roleColors = {
    ADMIN: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    MANAGER: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    EMPLOYEE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-full glass-card rounded-none border-r border-dark-700/50 flex flex-col z-20">
        {/* Logo */}
        <div className="p-6 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="font-bold text-dark-100 text-sm">ExpenseFlow</h1>
              <p className="text-xs text-dark-500">Reimbursement Portal</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark-100 truncate">{user?.full_name}</p>
              <p className="text-xs text-dark-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${roleColors[user?.role]}`}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-dark-700/50">
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
