import React from 'react';

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">{icon}</div>
    <div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1.5">{label}</p>
      <div className="text-base font-bold text-slate-700">{value}</div>
    </div>
  </div>
);

export default DetailItem;
