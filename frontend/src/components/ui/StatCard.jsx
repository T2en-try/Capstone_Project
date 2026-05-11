import React from 'react';

const StatCard = ({ title, value, color, icon }) => {
  const colors = { blue: 'bg-blue-600', yellow: 'bg-yellow-600', green: 'bg-green-600' };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <div className="text-3xl font-black text-slate-800 tracking-tighter">{value?.toLocaleString() || 0}</div>
      <div className={`h-1.5 w-8 mt-3 rounded-full ${colors[color]}`}></div>
    </div>
  );
};

export default StatCard;
