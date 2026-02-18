export function parseUtmParams(urlSearchParams: URLSearchParams) {
  const utm: Record<string, string> = {};
  ["utm_campaign", "utm_source", "utm_medium", "utm_term", "utm_content"].forEach((key) => {
    const value = urlSearchParams.get(key)?.trim();
    if (value) {
      utm[key] = value;
    }
  });
  return utm;
}
