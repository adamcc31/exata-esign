'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalBatches: number;
  totalClients: number;
  totalSigned: number;
  totalPending: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({ totalBatches: 0, totalClients: 0, totalSigned: 0, totalPending: 0 });
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      const batches = data.batches || [];
      setRecentBatches(batches.slice(0, 5));

      const totalClients = batches.reduce((sum: number, b: any) => sum + (b.total_clients || 0), 0);
      const totalSigned = batches.reduce((sum: number, b: any) => sum + (b.signed_count || 0), 0);

      setStats({
        totalBatches: batches.length,
        totalClients,
        totalSigned,
        totalPending: totalClients - totalSigned,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const role = (session?.user as any)?.role;
  const greeting = session?.user?.name ? `Halo, ${session.user.name}` : 'Dashboard';

  const statCards = [
    {
      label: 'Total Batch',
      value: stats.totalBatches,
      icon: 'inventory_2',
      overlayColor: 'bg-primary/5',
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-on-primary-fixed-variant',
    },
    {
      label: 'Total Klien',
      value: stats.totalClients,
      icon: 'group',
      overlayColor: 'bg-secondary/5',
      iconBg: 'bg-secondary-fixed',
      iconColor: 'text-on-secondary-fixed-variant',
    },
    {
      label: 'Sudah TTD',
      value: stats.totalSigned,
      icon: 'task_alt',
      overlayColor: 'bg-tertiary/5',
      iconBg: 'bg-tertiary-fixed',
      iconColor: 'text-on-tertiary-fixed-variant',
    },
    {
      label: 'Menunggu',
      value: stats.totalPending,
      icon: 'pending_actions',
      overlayColor: 'bg-error/5',
      iconBg: 'bg-error-container',
      iconColor: 'text-on-error-container',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline text-[2rem] font-bold text-on-surface">{greeting}</h1>
        <p className="font-body text-sm text-outline mt-1">
          {role === 'super_admin' ? 'Ringkasan seluruh sistem' : 'Ringkasan batch dan klien Anda'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <div key={stat.label} className="stat-card" style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`stat-card-overlay ${stat.overlayColor}`} />
            <div className="relative">
              <div className="flex justify-between items-start mb-5">
                <div className="font-body text-[0.6875rem] font-semibold uppercase tracking-wider text-outline">
                  {stat.label}
                </div>
                <div className={`stat-card-icon ${stat.iconBg} ${stat.iconColor}`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {stat.icon}
                  </span>
                </div>
              </div>
              <div className="font-headline text-[2rem] font-bold text-on-surface">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-surface-container rounded animate-pulse" />
                ) : stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Batches */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-headline text-base font-bold text-on-surface">Batch Terbaru</h2>
          <a href="/dashboard/batches" className="text-primary text-sm font-medium font-body hover:opacity-80 transition-opacity flex items-center gap-1">
            Lihat Semua
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </a>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nama Batch</th>
                <th>Diupload Oleh</th>
                <th>Total Klien</th>
                <th>Sudah TTD</th>
                <th>Tanggal</th>
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
              ) : recentBatches.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10">
                  <span className="material-symbols-outlined text-[40px] text-outline/30 mb-2 block">folder_open</span>
                  <span className="font-body text-sm text-outline">Belum ada batch.</span>
                </td></tr>
              ) : (
                recentBatches.map((batch: any) => (
                  <tr key={batch.id}>
                    <td>
                      <a href={`/dashboard/batches/${batch.id}`} className="text-primary font-medium font-body hover:opacity-80 transition-opacity">
                        {batch.batch_name}
                      </a>
                    </td>
                    <td className="font-body text-on-surface-variant">{batch.uploader_name || '-'}</td>
                    <td className="font-body">{batch.total_clients}</td>
                    <td>
                      <span className="badge-signed">{batch.signed_count}</span>
                    </td>
                    <td className="font-body text-xs text-outline">
                      {new Date(batch.uploaded_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
