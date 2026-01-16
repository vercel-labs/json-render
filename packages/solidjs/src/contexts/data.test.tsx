import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { DataProvider, useData, useDataValue, useDataBinding } from "./data";

describe("DataProvider", () => {
  it("provides initial data to children", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useData> | undefined;

      const TestChild = () => {
        result = useData();
        return null;
      };

      <DataProvider initialData={{ user: { name: "John" } }}>
        <TestChild />
      </DataProvider>;

      expect(result?.data()).toEqual({ user: { name: "John" } });
      dispose();
    });
  });

  it("provides empty object when no initial data", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useData> | undefined;

      const TestChild = () => {
        result = useData();
        return null;
      };

      <DataProvider>
        <TestChild />
      </DataProvider>;

      expect(result?.data()).toEqual({});
      dispose();
    });
  });

  it("provides auth state to children", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useData> | undefined;

      const TestChild = () => {
        result = useData();
        return null;
      };

      <DataProvider authState={{ isSignedIn: true, user: { id: "123" } }}>
        <TestChild />
      </DataProvider>;

      expect(result?.authState()).toEqual({
        isSignedIn: true,
        user: { id: "123" },
      });
      dispose();
    });
  });
});

describe("useData", () => {
  it("provides get function to retrieve values", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useData> | undefined;

      const TestChild = () => {
        result = useData();
        return null;
      };

      <DataProvider initialData={{ user: { name: "John" } }}>
        <TestChild />
      </DataProvider>;

      expect(result?.get("/user/name")).toBe("John");
      dispose();
    });
  });

  it("allows setting data at path with set function", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useData> | undefined;

      const TestChild = () => {
        result = useData();
        return null;
      };

      <DataProvider initialData={{}}>
        <TestChild />
      </DataProvider>;

      result?.set("/user/name", "Alice");
      const data = result?.data();
      expect((data?.user as Record<string, unknown>)?.name).toBe("Alice");
      dispose();
    });
  });

  it("calls onDataChange callback when data changes", () => {
    const onDataChange = vi.fn();

    createRoot((dispose) => {
      let result: ReturnType<typeof useData> | undefined;

      const TestChild = () => {
        result = useData();
        return null;
      };

      <DataProvider initialData={{}} onDataChange={onDataChange}>
        <TestChild />
      </DataProvider>;

      result?.set("/count", 42);

      expect(onDataChange).toHaveBeenCalledWith("/count", 42);
      dispose();
    });
  });

  it("allows updating multiple values with update function", () => {
    createRoot((dispose) => {
      let result: ReturnType<typeof useData> | undefined;

      const TestChild = () => {
        result = useData();
        return null;
      };

      <DataProvider initialData={{}}>
        <TestChild />
      </DataProvider>;

      result?.update({
        "/name": "John",
        "/age": 30,
      });

      const data = result?.data();
      expect(data?.name).toBe("John");
      expect(data?.age).toBe(30);
      dispose();
    });
  });
});

describe("useDataValue", () => {
  it("returns value at specified path", () => {
    createRoot((dispose) => {
      let value: string | undefined;

      const TestChild = () => {
        value = useDataValue<string>("/user/name");
        return null;
      };

      <DataProvider initialData={{ user: { name: "John", age: 30 } }}>
        <TestChild />
      </DataProvider>;

      expect(value).toBe("John");
      dispose();
    });
  });

  it("returns undefined for missing path", () => {
    createRoot((dispose) => {
      let value: string | undefined;

      const TestChild = () => {
        value = useDataValue<string>("/missing");
        return null;
      };

      <DataProvider initialData={{}}>
        <TestChild />
      </DataProvider>;

      expect(value).toBeUndefined();
      dispose();
    });
  });
});

describe("useDataBinding", () => {
  it("returns tuple with getter and setter for path", () => {
    createRoot((dispose) => {
      let binding: ReturnType<typeof useDataBinding<string>> | undefined;

      const TestChild = () => {
        binding = useDataBinding<string>("/name");
        return null;
      };

      <DataProvider initialData={{ name: "John" }}>
        <TestChild />
      </DataProvider>;

      const [getValue, setValue] = binding!;
      expect(getValue()).toBe("John");
      expect(typeof setValue).toBe("function");
      dispose();
    });
  });

  it("setter updates the value", () => {
    createRoot((dispose) => {
      let binding: ReturnType<typeof useDataBinding<string>> | undefined;

      const TestChild = () => {
        binding = useDataBinding<string>("/name");
        return null;
      };

      <DataProvider initialData={{ name: "John" }}>
        <TestChild />
      </DataProvider>;

      const [getValue, setValue] = binding!;
      setValue("Alice");
      expect(getValue()).toBe("Alice");
      dispose();
    });
  });
});
