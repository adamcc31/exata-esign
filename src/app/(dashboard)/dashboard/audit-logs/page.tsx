'use client';

import { useEffect, useState } from 'react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchLogs(); }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?page=${page}&limit=30`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      batch_upload: 'Upload Batch',
      batch_delete: 'Hapus Batch',
      client_signed: 'Klien TTD',
      user_create: 'Buat User',
      user_deactivate: 'Nonaktifkan User',
      user_update: 'Update User',
      user_reset_password: 'Reset Password',
    };
    return map[action] || action;
  };

  const actionIcon = (action: string) => {
    const map: Record<string, string> = {
      batch_upload: 'upload_file',
      batch_delete: 'delete',
      client_signed: 'draw',
      user_create: 'person_add',
      user_deactivate: 'person_off',
      user_update: 'edit',
      user_reset_password: 'lock_reset',
    };
    return map[action] || 'info';
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-headline text-[2rem] font-bold text-on-surface">Audit Log</h1>
        <p className="font-body text-sm text-outline mt-1">Riwayat semua aksi penting di sistem.</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Tipe</th>
                <th>Aksi</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-outline">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                    <span className="font-body text-sm">Memuat...</span>
                  </div>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10">
                  <span className="material-symbols-outlined text-[40px] text-outline/30 mb-2 block">history</span>
                  <span className="font-body text-sm text-outline">Belum ada log.</span>
                </td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="font-body text-xs text-outline whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('id-ID')}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                      </div>
                      <span className="font-body text-sm">{log.actor_name || log.actor_email || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge-pending capitalize">
                      {log.actor_type}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-outline">
                        {actionIcon(log.action)}
                      </span>
                      <span className="font-medium font-body text-sm">{actionLabel(log.action)}</span>
                    </div>
                  </td>
                  <td className="font-body text-xs text-outline max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-6 py-5 border-t border-surface-variant/50">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="btn-secondary btn-sm"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              Prev
            </button>
            <span className="font-body text-sm text-outline px-2">
              Halaman {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary btn-sm"
            >
              Next
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
