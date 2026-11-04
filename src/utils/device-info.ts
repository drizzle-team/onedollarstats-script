import type { NetworkInfo } from "../types";

// Network Information API is Chromium-only and missing from lib.dom
type NetworkInformation = {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

export type DeviceInfo = {
  sw?: number;
  sh?: number;
  n?: NetworkInfo;
};

export function getDeviceInfo(): DeviceInfo {
  const info: DeviceInfo = {};

  if (typeof screen !== "undefined" && screen.width && screen.height) {
    info.sw = screen.width;
    info.sh = screen.height;
  }

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection) {
    // undefined fields are dropped by JSON.stringify
    info.n = {
      et: connection.effectiveType,
      t: connection.type,
      dl: connection.downlink,
      rtt: connection.rtt,
      sd: connection.saveData
    };
  }

  return info;
}
