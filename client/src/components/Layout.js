import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/trees', label: isAdmin ? 'Trees' : 'My Trees', icon: '🌳' },
    { path: '/tokens', label: 'Tokens', icon: '🪙' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  if (isAdmin) {
    menuItems.splice(1, 0, { path: '/analytics', label: 'Analytics', icon: '📈' });
    menuItems.splice(2, 0, { path: '/users', label: 'Users', icon: '👥' });
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className={`bg-gradient-to-b from-primary to-primary-600 text-white flex flex-col transition-all duration-300 fixed h-screen overflow-y-auto ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <img src="/logo.png" alt="Releafnow" className="w-10 h-10 object-contain" />
          {sidebarOpen && <h2 className="text-xl font-semibold text-white m-0">Releafnow</h2>}
        </div>
        <nav className="flex-1 py-5">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center py-3.5 px-5 text-white/80 no-underline transition-all duration-200 border-l-[3px] border-transparent hover:bg-white/10 hover:text-white ${
                location.pathname === item.path 
                  ? 'bg-white/15 border-l-green-light text-white' 
                  : ''
              }`}
            >
              <span className="text-xl mr-3 w-6 text-center">{item.icon}</span>
              {sidebarOpen && <span className="text-[15px] font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-5 border-t border-white/10">
          {sidebarOpen && (
            <div className="mb-3">
              <div className="font-semibold mb-1">{user?.name}</div>
              <div className="text-xs text-white/70 capitalize">{user?.role}</div>
            </div>
          )}
          <button 
            onClick={handleLogout} 
            className={`w-full bg-white/10 border border-white/20 rounded-md text-white cursor-pointer text-sm transition-all duration-200 hover:bg-white/20 ${
              sidebarOpen ? 'py-2.5' : 'p-2 text-lg'
            }`}
          >
            {sidebarOpen ? 'Logout' : '🚪'}
          </button>
        </div>
      </aside>
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;



