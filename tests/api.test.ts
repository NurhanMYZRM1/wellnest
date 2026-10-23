import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { GET } from "../src/app/api/products/[barcode]/route";

const call = (barcode: string) =>
  GET(new Request(`http://localhost/api/products/${barcode}`), {
    params: Promise.resolve({ barcode }),
  });
test("API rejects invalid barcodes without upstream traffic", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("Should not fetch");
  });
  try {
    assert.equal((await call("abc")).status, 400);
    assert.equal((await call("123")).status, 400);
    assert.equal(fetchMock.mock.callCount(), 0);
  } finally {
    fetchMock.mock.restore();
  }
});
test("API normalizes products and caches successful lookup", async () => {
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: "Test oats",
            nutriments: { proteins_100g: 12 },
          },
        }),
        { status: 200 },
      ),
  );
  try {
    const response = await call("12345678");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /s-maxage/);
    const data = await response.json();
    assert.equal(data.name, "Test oats");
    assert.equal(
      data.nutrients.find((n: { label: string }) => n.label === "Energy")
        .per100,
      null,
    );
  } finally {
    fetchMock.mock.restore();
  }
});
test("API distinguishes an unknown product from upstream failure", async () => {
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ status: 0 }), { status: 200 }),
  );
  try {
    assert.equal((await call("12345678")).status, 404);
  } finally {
    fetchMock.mock.restore();
  }
  const unavailable = mock.method(globalThis, "fetch", async () => {
    throw new Error("Timeout");
  });
  try {
    assert.equal((await call("12345678")).status, 503);
  } finally {
    unavailable.mock.restore();
  }
});
