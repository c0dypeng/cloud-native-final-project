// Admin environment configuration.
// Admin app is a thin client over the API server — no DB or auth state lives here.

export const env = {
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  publicApiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
