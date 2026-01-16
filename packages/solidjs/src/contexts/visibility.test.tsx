import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { VisibilityProvider, useVisibility, useIsVisible } from "./visibility";
import { DataProvider } from "./data";

describe("useVisibility", () => {
  it("provides isVisible function", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useVisibility> | undefined;

      const TestChild = () => {
        result = useVisibility();
        return null;
      };

      <DataProvider>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(typeof result?.isVisible).toBe("function");
      dispose();
    });
  });

  it("provides visibility context", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useVisibility> | undefined;

      const TestChild = () => {
        result = useVisibility();
        return null;
      };

      <DataProvider initialData={{ test: true }}>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result?.ctx().dataModel).toEqual({ test: true });
      dispose();
    });
  });
});

describe("useIsVisible", () => {
  it("returns true for undefined condition", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible(undefined);
        return null;
      };

      <DataProvider>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(true);
      dispose();
    });
  });

  it("returns true for true condition", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible(true);
        return null;
      };

      <DataProvider>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(true);
      dispose();
    });
  });

  it("returns false for false condition", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible(false);
        return null;
      };

      <DataProvider>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(false);
      dispose();
    });
  });

  it("evaluates path conditions against data - true", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible({ path: "/isVisible" });
        return null;
      };

      <DataProvider initialData={{ isVisible: true }}>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(true);
      dispose();
    });
  });

  it("evaluates path conditions against data - false", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible({ path: "/isVisible" });
        return null;
      };

      <DataProvider initialData={{ isVisible: false }}>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(false);
      dispose();
    });
  });

  it("evaluates auth conditions - signedIn", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible({ auth: "signedIn" });
        return null;
      };

      <DataProvider authState={{ isSignedIn: true }}>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(true);
      dispose();
    });
  });

  it("evaluates auth conditions - signedOut", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible({ auth: "signedOut" });
        return null;
      };

      <DataProvider authState={{ isSignedIn: false }}>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(true);
      dispose();
    });
  });

  it("evaluates logic expressions", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible({ eq: [1, 1] });
        return null;
      };

      <DataProvider>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(true);
      dispose();
    });
  });

  it("evaluates complex conditions with data", () => {
    createRoot((dispose) => {
      let result: boolean | undefined;

      const TestChild = () => {
        result = useIsVisible({
          and: [{ path: "/user/isAdmin" }, { eq: [{ path: "/count" }, 5] }],
        });
        return null;
      };

      <DataProvider initialData={{ user: { isAdmin: true }, count: 5 }}>
        <VisibilityProvider>
          <TestChild />
        </VisibilityProvider>
      </DataProvider>;

      expect(result).toBe(true);
      dispose();
    });
  });
});
