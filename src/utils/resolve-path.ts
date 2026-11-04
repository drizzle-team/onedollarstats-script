export const resolvePath = (pathOrProps?: string, hashRouting: boolean = false): string => {
  if (pathOrProps) return pathOrProps;

  const sources = [
    { value: document.body?.getAttribute("data-s-path"), name: "data-s-path" },
    { value: document.body?.getAttribute("data-s:path"), name: "data-s:path" },
    { value: document.querySelector('meta[name="stonks-path"]')?.getAttribute("content"), name: "meta[stonks-path]" }
  ];

  // Only keep sources that actually exist
  const existing = sources.filter(({ value }) => value);

  if (existing.length > 1) {
    console.warn("[onedollarstats] Multiple path sources found. Using priority order:", existing.map(({ name }) => name).join(" > "));
  }

  // Hash route as path: "#/users?tab=1" -> "/users"
  const hashPath = hashRouting && location.hash.replace(/^#!?\/?/, "/").split("?")[0];

  // Return first available value, fallback to hash route or location.pathname
  return existing[0]?.value ?? (hashPath || location.pathname);
};
