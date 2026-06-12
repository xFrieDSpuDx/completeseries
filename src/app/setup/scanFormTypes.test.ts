import { describe, expect, it } from "vitest";
import { buildConnectionOptions, validateConnectionValues } from "./scanFormTypes";

describe("scan form types", () => {
  it("builds password connection options without exposing an API key field", () => {
    expect(
      buildConnectionOptions({
        serverUrl: "https://abs.example.test",
        authMode: "password",
        apiKey: "",
        username: "phill",
        password: "secret",
      })
    ).toEqual({
      serverUrl: "https://abs.example.test",
      mode: "password",
      username: "phill",
      password: "secret",
    });
  });

  it("builds API-key connection options without username or password fields", () => {
    expect(
      buildConnectionOptions({
        serverUrl: "https://abs.example.test",
        authMode: "apiKey",
        apiKey: "api-key",
        username: "",
        password: "",
      })
    ).toEqual({
      serverUrl: "https://abs.example.test",
      mode: "apiKey",
      apiKey: "api-key",
    });
  });

  it("validates required fields for each login method", () => {
    expect(
      validateConnectionValues({
        serverUrl: "",
        authMode: "password",
        apiKey: "",
        username: "phill",
        password: "secret",
      })
    ).toBe("Audiobookshelf URL is required.");

    expect(
      validateConnectionValues({
        serverUrl: "https://abs.example.test",
        authMode: "apiKey",
        apiKey: "",
        username: "",
        password: "",
      })
    ).toBe("API key is required.");

    expect(
      validateConnectionValues({
        serverUrl: "https://abs.example.test",
        authMode: "password",
        apiKey: "",
        username: "",
        password: "",
      })
    ).toBe("Username and password are required.");

    expect(
      validateConnectionValues({
        serverUrl: "https://abs.example.test",
        authMode: "password",
        apiKey: "",
        username: "phill",
        password: "secret",
      })
    ).toBe("");
  });
});
