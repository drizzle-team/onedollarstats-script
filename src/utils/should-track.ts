import type { InternalAnalyticsConfig } from "../types";

const matchesPattern = (path: string, pattern: string): boolean => {
  // Escape special regex characters except '*' which becomes '.*'
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(path);
};

export const shouldTrackPath = (path: string, config: InternalAnalyticsConfig): boolean => {
  // Exclude pages first
  if (config.excludePages.some((pattern) => matchesPattern(path, pattern))) return false;
  // If includePages is defined, only allow matching paths
  if (config.includePages.length && !config.includePages.some((pattern) => matchesPattern(path, pattern))) return false;
  return true;
};
