import React from 'react';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen app-atmosphere text-asphalt font-body">
      {children}
    </div>
  );
}
