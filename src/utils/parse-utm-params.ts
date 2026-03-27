export function parseUtmParams(urlSearchParams: URLSearchParams) {
  const utm: Record<string, string> = {};
  const keys = ["utm_campaign", "utm_source", "utm_medium", "utm_term", "utm_content"] as const;

  for (const key of keys) {
    const raw = urlSearchParams.get(key);
    if (!raw) continue;

    const decoded = decodeAndTrim(raw);
    if (decoded) {
      utm[key] = decoded;
    }
  }

  return utm;
}

function decodeAndTrim(value: string): string {
  let decoded = value;
  let previous = "";

  while (decoded !== previous) {
    previous = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return decoded.trim();
    }
  }

  return decoded.trim();
}
