import type { NextConfig } from "next";
const config: NextConfig = {
  // Dev only: lets a phone load the app from this machine's LAN IP, or over an HTTPS
  // Cloudflare quick tunnel (needed for the camera, which iOS allows only on HTTPS).
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "*.trycloudflare.com",
  ],
  devIndicators: false,
};
export default config;
