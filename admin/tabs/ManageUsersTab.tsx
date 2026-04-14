import React, { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { db } from '../../lib/firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { StaffMember, StaffRole } from '../../types';
import { normalizeZimbabwePhone } from '../../utils/phone';

interface ManageUsersTabProps {
  onNotify: (msg: string) => void;
}

const emptyForm = {
  name: '',
  role: 'doctor' as StaffRole,
  password: '',
  pin: ''
};

const ManageUsersTab: React.FC<ManageUsersTabProps> = ({ onNotify }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, "staff"), (snap) => {
      setStaff(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as StaffMember))
        .filter(member => !member.isMainAdmin)
      );
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "emergency"), (snap) => {
      const data = snap.data();
      if (data?.hospitalNumber) setEmergencyNumber(data.hospitalNumber);
    });

    return () => {
      unsubStaff();
      unsubSettings();
    };
  }, []);

  const startEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      name: member.name || '',
      role: member.role,
      password: member.password || '',
      pin: member.pin || ''
    });
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload: StaffMember = {
      name: form.name.trim(),
      role: form.role,
      updatedAt: serverTimestamp()
    };

    if (form.role === 'doctor') {
      payload.password = form.password.trim();
      payload.pin = '';
    } else {
      payload.pin = form.pin.trim();
      payload.password = '';
    }

    try {
      if (editing?.id) {
        await updateDoc(doc(db, "staff", editing.id), payload as any);
        onNotify("Staff profile updated");
      } else {
        await addDoc(collection(db, "staff"), {
          ...payload,
          createdAt: serverTimestamp(),
          isMainAdmin: false
        });
        onNotify("Staff profile added");
      }
      resetForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveEmergencyNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeZimbabwePhone(emergencyNumber);
    try {
      await setDoc(doc(db, "settings", "emergency"), {
        hospitalNumber: normalized,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setEmergencyNumber(normalized);
      onNotify("Emergency number saved");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const visibleCredential = form.role === 'doctor' ? form.password : form.pin;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <p className="text-[10px] font-black text-mPolyGreen uppercase tracking-widest">Access Control</p>
        <h3 className="text-3xl font-black uppercase text-mPolyBlue tracking-tighter">Manage Users</h3>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Create doctors, create admins, and update emergency dialing.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <Card title={editing ? `Editing ${editing.name}` : 'Add Staff User'} className="xl:col-span-1">
          <form onSubmit={saveStaff} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-400">User Type</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue"
              >
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-400">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.role === 'doctor' ? 'Doctor name' : 'Admin name'}
                className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-400">
                {form.role === 'doctor' ? 'Doctor Password' : 'Admin PIN'}
              </label>
              <input
                required
                value={visibleCredential}
                onChange={(e) => setForm(form.role === 'doctor' ? { ...form, password: e.target.value } : { ...form, pin: e.target.value })}
                placeholder={form.role === 'doctor' ? 'Password' : 'PIN'}
                className="w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-mPolyBlue"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="primary" fullWidth disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Update User' : 'Add User'}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="xl:col-span-2 space-y-8">
          <Card title="Current Staff">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff.map(member => (
                <div key={member.id} className="border-2 border-neutral-100 p-5 bg-slate-50 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">{member.role}</p>
                    <h4 className="text-sm font-black uppercase text-mPolyBlue">{member.name}</h4>
                    <p className="text-[10px] font-bold text-neutral-400 mt-1">
                      {member.role === 'doctor' ? `Password: ${member.password || 'Not set'}` : `PIN: ${member.pin || 'Not set'}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(member)}
                    className="px-5 py-3 bg-white border-2 border-neutral-100 text-[10px] font-black uppercase text-mPolyBlue hover:border-mPolyBlue transition-all"
                  >
                    Edit
                  </button>
                </div>
              ))}
              {staff.length === 0 && (
                <div className="md:col-span-2 py-16 text-center border-4 border-dashed border-neutral-100 text-neutral-300">
                  <i className="fa-solid fa-user-doctor text-4xl mb-4"></i>
                  <p className="text-xl font-black uppercase">No staff users yet</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Hospital Emergency Number">
            <form onSubmit={saveEmergencyNumber} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-neutral-400">Call Hospital Number</label>
                <input
                  required
                  value={emergencyNumber}
                  onChange={(e) => setEmergencyNumber(e.target.value)}
                  placeholder="7748478749"
                  className="mt-2 w-full bg-slate-50 border-2 border-neutral-100 p-4 text-xs font-bold outline-none focus:border-red-600"
                />
                <p className="text-[9px] font-bold text-neutral-400 uppercase mt-2">Numbers are saved with +263 automatically.</p>
              </div>
              <Button type="submit" variant="danger" className="md:self-end py-4">
                Save Number
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManageUsersTab;
