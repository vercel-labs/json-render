import { describe, expect, it } from "vitest";
import { TestBed } from "@angular/core/testing";
import { createStateStore } from "@json-render/core";

import { SpecStateService, type StateChange } from "./spec-state.service";

function make(): SpecStateService {
  TestBed.configureTestingModule({ providers: [SpecStateService] });
  return TestBed.inject(SpecStateService);
}

describe("SpecStateService", () => {
  it("gets and sets by JSON pointer", () => {
    const svc = make();
    svc.set("/a/b", 5);
    expect(svc.get("/a/b")).toBe(5);
  });

  it("emits change deltas on set (M5)", () => {
    const svc = make();
    const changes: StateChange[] = [];
    svc.onChange((c) => changes.push(...c));
    svc.set("/name", "Ada");
    expect(changes).toEqual([{ path: "/name", value: "Ada" }]);
  });

  it("emits one delta per key on update (M5)", () => {
    const svc = make();
    const seen: StateChange[] = [];
    svc.onChange((c) => seen.push(...c));
    svc.update({ "/a": 1, "/b": 2 });
    expect(seen).toEqual([
      { path: "/a", value: 1 },
      { path: "/b", value: 2 },
    ]);
  });

  it("watch() returns a memoized signal per path", () => {
    const svc = make();
    const s1 = svc.watch("/x");
    const s2 = svc.watch("/x");
    expect(s1).toBe(s2);
    svc.set("/x", 9);
    expect(s1()).toBe(9);
  });

  it("delegates to an external store when connected (M4)", () => {
    const svc = make();
    const store = createStateStore({ count: 1 });
    svc.connectStore(store);
    expect(svc.get("/count")).toBe(1);
    svc.set("/count", 2);
    expect(store.get("/count")).toBe(2);
    expect(svc.state()["count"]).toBe(2);
  });
});
