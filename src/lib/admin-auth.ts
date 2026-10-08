import { timingSafeEqual } from 'node:crypto';
export function adminAuthorized(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.slice(6), 'base64').toString();
  const actual = Buffer.from(decoded.slice(decoded.indexOf(':') + 1));
  const expected = Buffer.from(password);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function adminGuard(request: Request) {
  if (!adminAuthorized(request)) return new Response('请输入后台密码（用户名可任意填写）。部署前需配置 ADMIN_PASSWORD。', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Portfolio Admin", charset="UTF-8"' } });
  const origin = request.headers.get('origin');
  if (request.method !== 'GET' && origin !== new URL(request.url).origin) return new Response('不允许跨站请求', { status: 403 });
}
