export const resolvePath = (pathOrProps?: string): string => {
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

  // Return first available value, fallback to location.pathname
  return existing[0]?.value ?? location.pathname;
};
