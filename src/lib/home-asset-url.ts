const versions: Record<string, string> = JSON.parse(process.env.NEXT_PUBLIC_HOME_ASSET_VERSIONS || "{}");

/** Version local assets without changing existing model parameters or blob URLs. */
export function homeAssetUrl(url: string): string {
  const pathname = url.split(/[?#]/, 1)[0];
  const version = versions[pathname];
  if (!version) return url;
  const parsed = new URL(url, "https://home.invalid");
  parsed.searchParams.set("assetVersion", version);
  return parsed.pathname + parsed.search + parsed.hash;
}
