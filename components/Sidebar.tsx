import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  adminOnly?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M9 9h6" />
      </svg>
    ),
    description: 'Overview and favorites'
  },
  {
    name: 'Domain',
    href: '/domain',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
      </svg>
    ),
    description: 'Find domain names'
  },
  {
    name: 'Website',
    href: '/web',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    description: 'Build websites'
  },
  {
    name: 'Ads',
    href: '/ads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    description: 'Generate ad campaigns'
  },
  {
    name: 'Keywords',
    href: '/find-keywords',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    description: 'Research keywords'
  }
];

interface SidebarProps {
  isOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, collapsed = false, onClose, onToggle, className = '' }) => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch('/api/user/check-admin');
        const result = await response.json();
        setIsAdmin(result.isAdmin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
      }
    };

    if (isLoaded && user) {
      checkAdminStatus();
    }
  }, [isLoaded, user]);

  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  const handleItemClick = (item: SidebarItem, isActive: boolean, e: React.MouseEvent) => {
    // Close sidebar on mobile when navigation item is clicked
    if (onClose && window.innerWidth < 768) {
      onClose();
    }

    // If clicking on active item, toggle sidebar instead of navigating
    if (isActive && onToggle) {
      e.preventDefault();
      onToggle();
      return;
    }

    // For non-active items, let the Link handle navigation normally
  };

  // Filter sidebar items based on authentication and admin status
  const visibleItems = sidebarItems.filter(item => {
    // Show to all authenticated users unless specifically admin-only
    return !item.adminOnly || isAdmin;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-white border-r border-gray-200 flex flex-col fixed md:relative
        transform transition-all duration-300 ease-in-out z-50 min-h-screen
        ${isOpen && !collapsed ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
        ${collapsed ? 'md:translate-x-0 md:w-20' : 'md:translate-x-0 md:w-64'}
        ${className}
      `}>
        {/* Logo/Brand */}
        <div className="relative px-6 py-4 border-b border-gray-200">
          <div className={`flex items-center ${collapsed ? 'justify-between' : 'space-x-2'}`}>
            <Link href="/dashboard" onClick={handleNavClick} className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              {!collapsed && <span className="text-xl font-bold text-gray-900 truncate">SimplerB</span>}
            </Link>

            {/* Desktop Toggle Button */}
            {onToggle && (
              <button
                onClick={onToggle}
                className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-lg transition-all duration-200 group"
                title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
              >
                <svg
                  className="w-4 h-4 transition-all duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-6 space-y-2 ${collapsed ? 'px-2' : 'px-4'}`}>
          {visibleItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleItemClick(item, isActive, e)}
                className={`group flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-700 cursor-pointer'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <div className={`${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} ${collapsed ? '' : 'mr-3'}`}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    {item.description && (
                      <div className={`text-xs mt-0.5 truncate ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {item.description}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer at bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* User Session */}
          {user && (
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-shrink-0">
                <img
                  src={user.imageUrl}
                  alt={user.firstName || 'User'}
                  className="w-8 h-8 rounded-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user.emailAddresses[0]?.emailAddress}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            © 2025 SB
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
