import React, { useState } from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title = 'SimplerB'
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Head>
        <title>{title} - SimplerB</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen || (!sidebarCollapsed)}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'md:ml-0' : 'md:ml-0'
      }`}>
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">SB</span>
            </div>
            <span className="font-semibold text-gray-900">{title}</span>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Desktop Sidebar Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex fixed top-4 left-4 z-50 items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg border-2 border-white focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-200 group"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
