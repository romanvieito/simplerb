import React from 'react';
import { useRouter } from 'next/router';
import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ReactNode;
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
  },
  {
    name: 'Domain',
    href: '/domain',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
      </svg>
    ),
  },
  {
    name: 'Website',
    href: '/web',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Ads',
    href: '/ads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    name: 'Keywords',
    href: '/find-keywords',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
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
  const { user } = useUser();

  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked - only on client side
    if (onClose && typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose();
    }
  };

  const handleItemClick = (item: SidebarItem, isActive: boolean, e: React.MouseEvent) => {
    // Close sidebar on mobile when navigation item is clicked - only on client side
    if (onClose && typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose();
    }

    // Toggle sidebar when clicking on active item (current page) - useful for collapsing/expanding while staying on same page
    if (isActive && onToggle) {
      onToggle();
    }
  };

  // Show all sidebar items (no admin filtering needed since no items are admin-only)
  const visibleItems = sidebarItems;

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
        bg-white border-r border-gray-200 h-screen flex flex-col fixed
        transform transition-all duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0 w-64' : 'md:translate-x-0 -translate-x-full w-64'}
        ${collapsed ? 'md:w-20' : 'md:w-64'}
        ${className}
      `}>
        {/* Logo/Brand */}
        <div className="relative pl-2 pr-6 py-4 border-b border-gray-200">
          <div className={`flex items-center ${collapsed ? 'justify-between' : 'space-x-3'}`}>
            {/* Desktop Toggle Button */}
            {onToggle && (
              <button
                onClick={onToggle}
                className="flex items-center justify-center w-8 h-8 bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-all duration-200 group flex-shrink-0"
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

            <Link href="/dashboard" onClick={handleNavClick} className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              {!collapsed && <span className="text-xl font-bold text-gray-900 truncate">SimplerB</span>}
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`py-6 space-y-2 ${collapsed ? 'px-2' : 'px-4'} overflow-y-auto`}>
          {visibleItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <div
                key={item.name}
                onClick={(e) => handleItemClick(item, isActive, e)}
                className={`group flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Link
                  href={item.href}
                  className="flex items-center flex-1 min-w-0"
                >
                  <div className={`${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} ${collapsed ? '' : 'mr-3'}`}>
                    {item.icon}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                    </div>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          {/* User Session */}
          {user && (
            <div className={`${collapsed ? 'flex flex-col items-center space-y-2' : 'flex justify-center'}`}>
              <UserButton
                userProfileUrl="/user"
                afterSignOutUrl="/"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
