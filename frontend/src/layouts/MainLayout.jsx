import React from 'react';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {children}
    </div>
  );
}
