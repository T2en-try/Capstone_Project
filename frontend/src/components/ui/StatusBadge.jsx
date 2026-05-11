import React from 'react';

const StatusBadge = ({ status, size = 'sm' }) => {
  const styles = {
    pending:    'bg-amber-100 text-amber-700 ring-amber-600/20',
    processing: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    completed:  'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    rejected:   'bg-rose-100 text-rose-700 ring-rose-600/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ring-1 ring-inset ${styles[status]} ${size==='sm' ? 'px-2.5 py-1 text-[10px]' : 'px-4 py-1.5 text-xs shadow-lg backdrop-blur-md'}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
