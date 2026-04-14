
import React, { useState, useMemo } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { InventoryItem } from '../../types';
import { db } from '../../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface PharmacyTabProps {
  inventory: InventoryItem[];
  onNotify: (msg: string) => void;
}

const PharmacyTab: React.FC<PharmacyTabProps> = ({ inventory, onNotify }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categories = ['ALL', 'GENERAL', 'PAIN RELIEF', 'ANTIBIOTIC', 'FIRST AID', 'VACCINE'];

  const handleSaveStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name'), stock: Number(fd.get('stock')),
      expiry: fd.get('expiry'), category: fd.get('category'),
      lowStockLevel: Number(fd.get('lowLevel') || 20)
    };
    try {
      if (editingItem) {
        await updateDoc(doc(db, "inventory", editingItem.id), data);
        onNotify("Stock Component Updated");
      } else {
        await addDoc(collection(db, "inventory"), data);
        onNotify("New Stock Added Successfully");
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const filtered = useMemo(() => {
    return inventory.filter(i => {
      const matchesSearch = (i.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || (i.category || 'GENERAL') === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || 
                           (statusFilter === 'LOW' && i.stock <= (i.lowStockLevel || 20)) ||
                           (statusFilter === 'OK' && i.stock > (i.lowStockLevel || 20));
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, search, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h3 className="text-3xl font-black uppercase text-mPolyBlue tracking-tighter">Pharmacy Control</h3>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Medical Supply Inventory</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
           <input type="text" placeholder="FILTER BY NAME..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white border-2 border-neutral-100 px-6 py-3 text-[10px] font-black uppercase outline-none focus:border-mPolyBlue flex-1 lg:w-48 shadow-sm" />
           <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white border-2 border-neutral-100 px-4 py-3 text-[10px] font-black uppercase focus:border-mPolyBlue shadow-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border-2 border-neutral-100 px-4 py-3 text-[10px] font-black uppercase focus:border-mPolyBlue shadow-sm">
              <option value="ALL">ALL STATUS</option>
              <option value="LOW">CRITICAL STOCK</option>
              <option value="OK">OPTIMAL</option>
           </select>
           <Button variant="primary" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-mPolyGreen shrink-0 shadow-lg">New Item</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-mPolyBlue text-white text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="p-5">Medicine Component</th>
                <th className="p-5">Category</th>
                <th className="p-5">Units</th>
                <th className="p-5">Registry</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[11px] font-bold uppercase text-neutral-600">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-5 text-neutral-900 font-black">{item.name}</td>
                  <td className="p-5">{item.category || 'GENERAL'}</td>
                  <td className="p-5">{item.stock} Units</td>
                  <td className="p-5">
                    {item.stock <= (item.lowStockLevel || 20) ? (
                      <span className="bg-red-600 text-white px-3 py-1 text-[8px] font-black">REPLENISH NOW</span>
                    ) : (
                      <span className="bg-mPolyGreen/10 text-mPolyGreen px-3 py-1 text-[8px] font-black">OPTIMAL</span>
                    )}
                  </td>
                  <td className="p-5 text-right flex justify-end gap-3">
                    <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-mPolyBlue hover:underline text-[9px] font-black tracking-widest">EDIT</button>
                    <button onClick={() => confirm(`Permanently remove ${item.name}?`) && deleteDoc(doc(db, "inventory", item.id))} className="text-red-400 hover:underline text-[9px] font-black tracking-widest">DELETE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-mPolyBlue/95 z-[500] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-12 shadow-2xl relative animate-slide-right">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-neutral-300 hover:text-red-500"><i className="fa-solid fa-xmark text-2xl"></i></button>
             <h3 className="text-2xl font-black uppercase tracking-tighter text-mPolyBlue mb-8">{editingItem ? 'Edit Component' : 'New Stock Entry'}</h3>
             <form className="space-y-6" onSubmit={handleSaveStock}>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-mPolyBlue">Name</label><input name="name" defaultValue={editingItem?.name} required className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold uppercase outline-none focus:border-mPolyBlue" /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[9px] font-black uppercase text-mPolyBlue">Category</label>
                     <select name="category" defaultValue={editingItem?.category || 'GENERAL'} className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold uppercase outline-none focus:border-mPolyBlue">
                        {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div className="space-y-1"><label className="text-[9px] font-black uppercase text-mPolyBlue">Low Level Alert</label><input name="lowLevel" type="number" defaultValue={editingItem?.lowStockLevel || 20} className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[9px] font-black uppercase text-mPolyBlue">Units</label><input name="stock" type="number" defaultValue={editingItem?.stock} required className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black uppercase text-mPolyBlue">Expiry Date</label><input name="expiry" type="date" defaultValue={editingItem?.expiry} required className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue" /></div>
                </div>
                <Button variant="primary" fullWidth disabled={isSaving} className="mt-6 py-5 shadow-2xl">{isSaving ? 'Processing...' : 'Save Stock Data'}</Button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyTab;
