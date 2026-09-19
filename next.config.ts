import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  basePath: "/orbit",
};

export default config;
