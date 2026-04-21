'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      setFormData({ name: '', email: '', password: '', role: 'staff' });
      fetchUsers();
    } catch (err: any) { setFormError(err.message); }
    finally { setFormLoading(false); }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    if (!confirm(currentActive ? 'Nonaktifkan user ini?' : 'Aktifkan kembali user ini?')) return;
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt('Masukkan password baru (min 8 karakter):');
    if (!newPassword) return;
    try {
      const res = await fetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) alert('Password berhasil direset.');
      else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) { alert('Gagal reset password.'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-[2rem] font-bold text-on-surface">Kelola User</h1>
          <p className="font-body text-sm text-outline mt-1">Buat, nonaktifkan, dan reset password akun staff.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Tambah User
        </button>
      </div>

      {showForm && (
        <div className="card card-body mb-8 max-w-lg animate-slide-up">
          <h3 className="font-headline text-base font-bold text-on-surface mb-5">Buat Akun Baru</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Nama</label>
              <input className="input" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required minLength={8} value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <div className="relative">
                <select className="input appearance-none pr-10" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
                  <option value="staff">Staff</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>
            {formError && (
              <div className="bg-error-container/50 border border-error/20 rounded-DEFAULT px-4 py-3 text-on-error-container text-sm font-body flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {formError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Menyimpan...
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Simpan
                  </>
                )}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-outline">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                    <span className="font-body text-sm">Memuat...</span>
                  </div>
                </td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant text-xs font-bold font-body">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium font-body">{u.name}</span>
                    </div>
                  </td>
                  <td className="font-body text-on-surface-variant">{u.email}</td>
                  <td>
                    <span className={u.role === 'super_admin' ? 'badge-signed' : 'badge-pending'}>
                      <span className="material-symbols-outlined text-[14px]">
                        {u.role === 'super_admin' ? 'shield_person' : 'person'}
                      </span>
                      {u.role === 'super_admin' ? 'Super Admin' : 'Staff'}
                    </span>
                  </td>
                  <td>
                    {u.is_active ? (
                      <span className="badge-signed">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Aktif
                      </span>
                    ) : (
                      <span className="badge-expired">
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="font-body text-xs text-outline">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleActive(u.id, u.is_active)} className="text-outline hover:text-primary p-2 rounded-full hover:bg-surface-container transition-all" title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                        <span className="material-symbols-outlined text-[18px]">
                          {u.is_active ? 'person_off' : 'person_check'}
                        </span>
                      </button>
                      <button onClick={() => handleResetPassword(u.id)} className="text-outline hover:text-secondary p-2 rounded-full hover:bg-secondary-fixed/30 transition-all" title="Reset Password">
                        <span className="material-symbols-outlined text-[15px]">lock_reset</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
