import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  stream: vi.fn(),
  minute: vi.fn(),
  daily: vi.fn(),
}));
vi.mock("@/lib/agent", () => ({ agent: { stream: mocks.stream } }));
vi.mock("@/lib/rate-limit", () => ({
  minuteRateLimit: { limit: mocks.minute },
  dailyRateLimit: { limit: mocks.daily },
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": "192.0.2.10, 192.0.2.20" }),
}));
afterEach(() => vi.resetAllMocks());

it.each(["minute", "daily"])(
  "enforces the %s limit before generation or search",
  async (limit) => {
    mocks.minute.mockResolvedValue({ success: limit !== "minute" });
    mocks.daily.mockResolvedValue({ success: limit !== "daily" });
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              parts: [{ type: "text", text: "Find public documentation" }],
            },
          ],
        }),
      }),
    );
    expect(response.status).toBe(429);
    expect((await response.json()).error).toBe("Rate limit exceeded");
    expect(mocks.minute).toHaveBeenCalledWith("192.0.2.10");
    expect(mocks.daily).toHaveBeenCalledWith("192.0.2.10");
    expect(mocks.stream).not.toHaveBeenCalled();
  },
);

it("keeps message validation ahead of generation", async () => {
  mocks.minute.mockResolvedValue({ success: true });
  mocks.daily.mockResolvedValue({ success: true });
  const response = await POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    }),
  );
  expect(response.status).toBe(400);
  expect(mocks.stream).not.toHaveBeenCalled();
});
