/**
 * Prepend the configured base path (e.g. a GitHub Pages subpath) to an
 * absolute-ish URL path. The base comes from `NEXT_PUBLIC_BASE_PATH` and
 * defaults to an empty string for root deployments.
 */
export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const sep = path.startsWith("/") ? "" : "/";
  return `${base}${sep}${path}`;
}
