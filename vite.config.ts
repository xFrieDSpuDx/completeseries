import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const audibleApiTargets = {
  au: "https://api.audible.com.au",
  br: "https://api.audible.com.br",
  ca: "https://api.audible.ca",
  de: "https://api.audible.de",
  es: "https://api.audible.es",
  fr: "https://api.audible.fr",
  in: "https://api.audible.in",
  it: "https://api.audible.it",
  jp: "https://api.audible.co.jp",
  uk: "https://api.audible.co.uk",
  us: "https://api.audible.com",
};

type ProxyRequest = {
  removeHeader: (name: string) => void;
  setHeader: (name: string, value: string) => void;
};

type HttpProxyLike = {
  on: (event: "proxyReq", callback: (proxyRequest: ProxyRequest) => void) => void;
};

const headersToStrip = [
  "authorization",
  "cookie",
  "origin",
  "referer",
  "x-api-key",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
];

/**
 * Purpose: Remove local application credentials and browser-origin headers from
 * public catalogue forwarding requests.
 *
 * @param proxy - Vite HTTP proxy instance.
 * @returns Nothing. The outgoing proxy request is adjusted in place.
 */
function configureCatalogueForwarding(proxy: HttpProxyLike): void {
  proxy.on("proxyReq", (proxyRequest) => {
    for (const header of headersToStrip) {
      proxyRequest.removeHeader(header);
    }

    proxyRequest.setHeader("Accept", "application/json");
  });
}

const audibleCatalogueRoutes = Object.fromEntries(
  Object.entries(audibleApiTargets).map(([region, target]) => [
    `/api/audible/${region}`,
    {
      target,
      changeOrigin: true,
      configure: configureCatalogueForwarding,
      rewrite: (path: string) => path.replace(`/api/audible/${region}`, ""),
    },
  ])
);

const appleBooksProxy = {
  "/api/apple-books": {
    target: "https://itunes.apple.com",
    changeOrigin: true,
    configure: configureCatalogueForwarding,
    rewrite: (path: string) => path.replace("/api/apple-books", ""),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
    proxy: {
      ...audibleCatalogueRoutes,
      ...appleBooksProxy,
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**", "coverage/**", "v2/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 80,
        statements: 80,
      },
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/fixtures/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
  },
});
