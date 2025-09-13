import React from 'react';
import type { LayoutProps } from '../types';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full min-h-screen">
        <div className="w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;