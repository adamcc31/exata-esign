'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider } from '@/components/AuthProvider';

function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;
  const userName = session?.user?.name || 'User';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/dashboard/batches', label: 'Batch Upload', icon: 'upload_file' },
    ...(role === 'super_admin' ? [
      { href: '/dashboard/users', label: 'Kelola User', icon: 'group' },
      { href: '/dashboard/audit-logs', label: 'Audit Log', icon: 'assignment' },
    ] : []),
  ];

  return (
    <aside className="fixed top-0 left-0 h-full w-[272px] bg-inverse-surface flex flex-col z-50">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-DEFAULT bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-on-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
          </div>
          <div>
            <p className="text-inverse-on-surface text-sm font-bold font-headline tracking-tight">Speed Nenkin</p>
            <p className="text-inverse-on-surface/40 text-xs font-body">E-Sign Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-DEFAULT text-sm font-medium font-body transition-all duration-200 ${
                isActive
                  ? 'bg-primary/20 text-primary-fixed'
                  : 'text-inverse-on-surface/60 hover:bg-white/8 hover:text-inverse-on-surface'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary-fixed-dim' : ''}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/25 flex items-center justify-center text-primary-fixed-dim text-xs font-bold font-body">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-inverse-on-surface text-sm font-medium truncate font-body">{userName}</p>
            <p className="text-inverse-on-surface/40 text-xs capitalize font-body">{role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-inverse-on-surface/40 hover:text-error transition-colors p-1.5 rounded-full hover:bg-white/8"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[272px] min-h-screen">
          <div className="p-8 max-w-7xl">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}
