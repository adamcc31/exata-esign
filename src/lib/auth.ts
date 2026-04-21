import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'staff';
};

export async function getSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user as SessionUser;
}

export async function requireRole(role: 'super_admin' | 'staff'): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new Error('Forbidden');
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('super_admin');
}
