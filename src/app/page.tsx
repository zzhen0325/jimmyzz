import { HomePage } from "@/components/home-page";
import { ContentProvider } from "@/components/content-provider";
import { readContent } from "@/lib/content-store";
export const dynamic = "force-dynamic";
export default async function Page() { return <ContentProvider value={await readContent()}><HomePage/></ContentProvider>; }
