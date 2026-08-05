import React from 'react';

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="p-2.5 bg-mist border border-line rounded-xl text-ink-soft">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-asphalt/55 font-medium mb-0.5">{label}</p>
      <div className="text-[15px] font-semibold text-ink">{value}</div>
    </div>
  </div>
);

export default DetailItem;
