import React from 'react';

const LABELS = {
  pending: 'รอรับเรื่อง',
  processing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
  rejected: 'ไม่ผ่านการตรวจ',
};

const STYLES = {
  pending: 'bg-mark/20 text-mark-deep border-mark/40',
  processing: 'bg-info/10 text-info border-info/30',
  completed: 'bg-ok/10 text-ok border-ok/30',
  rejected: 'bg-danger/10 text-danger border-danger/30',
};

const StatusBadge = ({ status, size = 'sm' }) => (
  <span
    className={`inline-flex items-center border font-semibold ${STYLES[status] || STYLES.pending} ${
      size === 'sm' ? 'px-2.5 py-1 text-[11px] rounded-md' : 'px-3 py-1.5 text-xs rounded-lg'
    }`}
  >
    {LABELS[status] || status}
  </span>
);

export default StatusBadge;
