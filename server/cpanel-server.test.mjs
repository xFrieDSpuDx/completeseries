import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildStaticHeaders,
  decodePath,
  filterProviderResponseHeaders,
  resolveProviderTarget,
  resolveStaticFilePath,
} from "./cpanel-server.mjs";

describe("cPanel hosting server", () => {
  it("forwards only supported Audible catalogue routes", () => {
    const target = resolveProviderTarget(
      "/api/audible/uk/1.0/catalog/products/B09MDKHZV5?response_groups=series",
      "GET"
    );

    expect(target.kind).toBe("provider");
    expect(target.url.href).toBe(
      "https://api.audible.co.uk/1.0/catalog/products/B09MDKHZV5?response_groups=series"
    );

    expect(resolveProviderTarget("/api/audible/uk/anything-else", "GET")).toMatchObject({
      kind: "blocked",
      status: 404,
    });
    expect(resolveProviderTarget("/api/audible/uk/1.0/catalog/products", "POST")).toMatchObject({
      kind: "blocked",
      status: 405,
    });
  });

  it("forwards only supported Apple Books routes", () => {
    const target = resolveProviderTarget(
      "/api/apple-books/search?country=GB&media=audiobook&term=Discworld",
      "HEAD"
    );

    expect(target.kind).toBe("provider");
    expect(target.url.href).toBe(
      "https://itunes.apple.com/search?country=GB&media=audiobook&term=Discworld"
    );

    expect(resolveProviderTarget("/api/apple-books/profile", "GET")).toMatchObject({
      kind: "blocked",
      status: 404,
    });
  });

  it("leaves non-provider routes for static handling", () => {
    expect(resolveProviderTarget("/assets/index.js", "GET")).toEqual({ kind: "none" });
  });

  it("filters provider response headers before returning them to the browser", () => {
    expect(
      filterProviderResponseHeaders({
        "cache-control": "max-age=60",
        "content-type": "application/json",
        "set-cookie": "session=private",
        "x-forwarded-for": "127.0.0.1",
      })
    ).toEqual({
      "cache-control": "max-age=60",
      "content-type": "application/json",
    });
  });

  it("resolves static files, SPA routes, and blocked traversal paths", async () => {
    const distDirectory = await mkdtemp(path.join(tmpdir(), "complete-series-dist-"));

    try {
      await mkdir(path.join(distDirectory, "assets"));
      await writeFile(path.join(distDirectory, "index.html"), "<!doctype html>");
      await writeFile(path.join(distDirectory, "assets", "index.js"), "console.log('ok');");

      await expect(resolveStaticFilePath(distDirectory, "/")).resolves.toBe(
        path.join(distDirectory, "index.html")
      );
      await expect(resolveStaticFilePath(distDirectory, "/results")).resolves.toBe(
        path.join(distDirectory, "index.html")
      );
      await expect(resolveStaticFilePath(distDirectory, "/assets/index.js")).resolves.toBe(
        path.join(distDirectory, "assets", "index.js")
      );
      await expect(resolveStaticFilePath(distDirectory, "/assets/missing.js")).resolves.toBeNull();
      await expect(resolveStaticFilePath(distDirectory, "/../package.json")).resolves.toBeNull();
    } finally {
      await rm(distDirectory, { force: true, recursive: true });
    }
  });

  it("builds cache headers for the app shell and fingerprinted assets", () => {
    expect(buildStaticHeaders("/dist/index.html")).toMatchObject({
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    });
    expect(buildStaticHeaders("/dist/assets/index.js")).toMatchObject({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "text/javascript; charset=utf-8",
    });
  });

  it("returns an empty path for malformed URL encoding", () => {
    expect(decodePath("/broken/%E0%A4%A")).toBe("");
  });
});
