export function parseUtmParams(urlSearchParams: URLSearchParams) {
  const utm: Record<string, string> = {};
  const keys = ["utm_campaign", "utm_source", "utm_medium", "utm_term", "utm_content"] as const;

  for (const key of keys) {
    const raw = urlSearchParams.get(key);
    if (!raw) continue;

    const decoded = recursiveDecode(raw).trim();
    if (decoded) {
      utm[key] = decoded;
    }
  }

  return utm;
}

const recursiveDecode = (value: string): string => {
  let current = value;

  try {
    let decoded = decodeURIComponent(current);

    while (decoded !== current) {
      current = decoded;
      decoded = decodeURIComponent(current);
    }

    return current;
  } catch {
    return value;
  }
};

