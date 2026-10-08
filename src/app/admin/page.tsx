import { AdminEditor } from './editor';
import { readContent } from '@/lib/content-store';
export const dynamic = 'force-dynamic';
export const metadata = { title: '内容管理', robots: { index: false, follow: false } };
export default async function AdminPage() { return <AdminEditor initial={await readContent()} />; }
