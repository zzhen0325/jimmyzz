import { adminGuard } from '@/lib/admin-auth';
export function proxy(request: Request) { return adminGuard(request); }
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
