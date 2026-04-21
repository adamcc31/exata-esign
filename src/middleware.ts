import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Super admin only routes
    const adminRoutes = ['/dashboard/users', '/dashboard/audit-logs'];
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    
    if (isAdminRoute && token?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // API admin-only routes
    if (pathname.startsWith('/api/users') && token?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (pathname.startsWith('/api/audit-logs') && token?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (pathname.match(/^\/api\/batches\/[^/]+$/) && req.method === 'DELETE' && token?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public routes — no auth needed
        if (pathname.startsWith('/sign/') || pathname.startsWith('/api/sign/')) return true;
        if (pathname === '/login') return true;
        if (pathname === '/') return true;
        // All other routes need auth
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/batches/:path*',
    '/api/users/:path*',
    '/api/clients/:path*',
    '/api/audit-logs/:path*',
  ],
};
