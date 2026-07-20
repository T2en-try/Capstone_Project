import React from 'react';

const StatCard = ({ title, value }) => (
  <div className="min-w-0">
    <p className="text-xs text-asphalt/55 font-medium">{title}</p>
    <p className="font-display text-2xl text-ink tracking-tight mt-0.5">
      {value?.toLocaleString?.() ?? value ?? 0}
    </p>
  </div>
);

export default StatCard;
