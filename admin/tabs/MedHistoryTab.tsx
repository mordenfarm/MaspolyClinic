
import React, { useState, useMemo } from 'react';
import { Card } from '../../components/Card';
import { PharmacyHistory } from '../../types';

interface MedHistoryTabProps {
  history: PharmacyHistory[];
}

const MedHistoryTab: React.FC<MedHistoryTabProps> = ({ history }) => {
  const [dateFilter, setDateFilter] = useState('');

  const filtered = useMemo(() => {
    if (!dateFilter) return history;
    return history.filter(h => {
      const hDate = h.date?.toDate?.() ? h.date.toDate().toISOString().split('T')[0] : '';
      return hDate === dateFilter;
    });
  }, [history, dateFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h3 className="text-3xl font-black uppercase text-mPolyBlue tracking-tighter">Pharmacy History</h3>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Medical Dispensary Ledger</p>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <p className="text-[9px] font-black uppercase text-neutral-400">Filter Date:</p>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-white border-2 border-neutral-100 px-6 py-3 text-[10px] font-black uppercase outline-none focus:border-mPolyBlue flex-1 lg:w-64 shadow-sm" />
        </div>
      </div>

      <Card className="p-0 border-none overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-mPolyBlue text-white text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="p-5">Student</th>
                <th className="p-5">Medicine</th>
                <th className="p-5">Quantity</th>
                <th className="p-5">Timestamp</th>
                <th className="p-5">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[10px] font-bold uppercase text-neutral-600">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-5 text-neutral-900 font-black">{h.studentName}</td>
                  <td className="p-5 text-mPolyGreen">{h.medicineName}</td>
                  <td className="p-5">{h.units} Units</td>
                  <td className="p-5 text-neutral-400">
                    {h.date?.toDate?.() ? h.date.toDate().toLocaleString('en-GB') : 'Syncing...'}
                  </td>
                  <td className="p-5">{h.doctorName}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center opacity-30 font-black uppercase italic tracking-widest">No history recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default MedHistoryTab;
