import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const demo = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore demo", exact: true }).click();
};
const nav = async (page: Page, name: string) => {
  await page
    .locator(".sidebar")
    .getByRole("button", { name, exact: true })
    .click();
};

test("demo persists and stays separate from personal data", async ({
  page,
}) => {
  await demo(page);
  await expect(
    page.getByText("Sample records. Real possibilities."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Sample records. Real possibilities."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use my own data" }).click();
  await expect(page.getByText("no records yet")).toBeVisible();
  await page.getByRole("button", { name: "My space" }).click();
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await nav(page, "Sleep");
  await expect(page.getByText("7 nights logged")).toBeVisible();
});

test("sleep add, edit, validation, delete, and reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start fresh" }).click();
  await nav(page, "Sleep");
  await page.getByRole("button", { name: "Log sleep", exact: true }).click();
  await page.getByLabel("Bedtime", { exact: true }).fill("2026-10-20T23:00");
  await page.getByLabel("Wake-up", { exact: true }).fill("2026-10-21T07:00");
  await page.getByRole("button", { name: "Save sleep" }).click();
  await expect(page.getByText("1 nights logged")).toBeVisible();
  await page.reload();
  await nav(page, "Sleep");
  await expect(page.getByText("1 nights logged")).toBeVisible();
  await page.getByRole("button", { name: /Edit sleep/ }).click();
  await page.getByLabel("Wake-up", { exact: true }).fill("2026-10-20T22:00");
  await page.getByRole("button", { name: "Save sleep" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Wake-up must be after bedtime",
  );
  await page.getByLabel("Wake-up", { exact: true }).fill("2026-10-21T07:30");
  await page.getByRole("button", { name: "Save sleep" }).click();
  await expect(page.locator(".journal-duration")).toHaveText("8h 30m");
  await page.getByRole("button", { name: /Delete sleep/ }).click();
  await expect(page.getByText("0 nights logged")).toBeVisible();
});

test("work timer pauses while hidden and logs movement", async ({ page }) => {
  await page.clock.install();
  await demo(page);
  await nav(page, "Movement");
  await page.getByRole("button", { name: "Start work session" }).click();
  await page.clock.runFor(250);
  await page.clock.fastForward(30000);
  await expect(page.locator(".work-clock")).toHaveText("00:30");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(30000);
  await expect(page.locator(".work-clock")).toHaveText("00:30");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(250);
  await page.clock.fastForward(30000);
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.locator(".list-footer")).toContainText("46 minutes");
  await page.getByRole("button", { name: "Start work session" }).click();
  await page.clock.runFor(250);
  await page.clock.fastForward(1800000);
  await expect(
    page.getByText("YOUR BREAK IS READY", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I took a stretch break" }).click();
  await expect(
    page.getByText("YOUR BREAK IS READY", { exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Log posture check-in" }).click();
  await page.getByLabel("Minutes", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(
    page.locator(".activity-list").getByText("Walking", { exact: true }),
  ).toBeVisible();
});

test("breathing pauses, resumes, completes once, and respects reduced motion", async ({
  page,
}) => {
  await page.clock.install();
  await demo(page);
  await nav(page, "Breathe");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Begin session" }).click();
  await page.clock.runFor(250);
  await page.clock.fastForward(10000);
  await page.getByRole("button", { name: "Pause session" }).click();
  const remaining = await page.locator(".breathing-clock").innerText();
  await page.clock.fastForward(20000);
  await expect(page.locator(".breathing-clock")).toHaveText(remaining);
  await page.getByRole("button", { name: "Resume session" }).click();
  await page.clock.runFor(250);
  await page.clock.fastForward(51000);
  await expect(page.getByText("Beautifully done.")).toBeVisible();
  await expect(
    page.getByText("4 mindful minutes today", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(10000);
  await expect(
    page.getByText("4 mindful minutes today", { exact: true }),
  ).toBeVisible();
  const breathingCount = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("wellnest:v1:demo")!).breathing.length,
  );
  expect(breathingCount).toBe(2);
});

test("reminders support daily times, snooze, taken, undo, and history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start fresh" }).click();
  await nav(page, "Reminders");
  await page.getByRole("button", { name: "Add reminder", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("My vitamin");
  await page.getByLabel("Reminder time 1", { exact: true }).fill("00:01");
  await page.getByRole("button", { name: "Add time", exact: true }).click();
  await page.getByRole("button", { name: "Save reminder" }).click();
  await expect(page.getByText("0 of 2 taken today")).toBeVisible();
  await page
    .getByRole("button", { name: "Snooze My vitamin for 15 minutes" })
    .first()
    .click();
  await expect(page.getByText(/Later at/)).toBeVisible();
  await page
    .getByRole("button", { name: "Mark My vitamin taken" })
    .first()
    .click();
  await expect(page.getByText("1 of 2 taken today")).toBeVisible();
  await page.getByRole("button", { name: "Undo taken My vitamin" }).click();
  await expect(page.getByText("0 of 2 taken today")).toBeVisible();
  await page.reload();
  await nav(page, "Reminders");
  await expect(page.getByText("0 of 2 taken today")).toBeVisible();
});

test("nutrition sample saves, lookup succeeds, and errors recover", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start fresh" }).click();
  await nav(page, "Nutrition");
  await page
    .getByRole("button", { name: "Explore sample", exact: true })
    .click();
  await expect(
    page.getByText("Sample product · illustrative data"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save to my pantry" }).click();
  await expect(page.getByText("1 saved products")).toBeVisible();
  const fixture = {
    barcode: "12345678",
    name: "Test product",
    brand: "Test brand",
    ingredients: "",
    allergens: "",
    grade: "",
    serving: "",
    basis: "100g / 100ml",
    source: "openfoodfacts",
    sourceUrl: "https://world.openfoodfacts.org/product/12345678",
    nutrients: [
      { label: "Energy", unit: "kcal", per100: null, perServing: null },
    ],
  };
  await page.route("**/api/products/12345678", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.getByLabel("Product barcode", { exact: true }).fill("12345678");
  await page.getByRole("button", { name: "Look up barcode" }).click();
  await expect(
    page.getByRole("heading", { name: "Test product", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Allergen information is unavailable. Check the product label.",
    ),
  ).toBeVisible();
  await page.route("**/api/products/00000000", (route) =>
    route.fulfill({
      status: 404,
      json: { error: "This barcode is not in Open Food Facts yet." },
    }),
  );
  await page.getByLabel("Product barcode", { exact: true }).fill("00000000");
  await page.getByRole("button", { name: "Look up barcode" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "not in Open Food Facts",
  );
  await page.route("**/api/products/11111111", (route) => route.abort());
  await page.getByLabel("Product barcode", { exact: true }).fill("11111111");
  await page.getByRole("button", { name: "Look up barcode" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "offline",
  );
  await page
    .getByRole("button", { name: "Explore sample", exact: true })
    .click();
  await expect(
    page.getByText("Sample product · illustrative data"),
  ).toBeVisible();
});

test("camera denial offers manual barcode recovery", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await demo(page);
  await nav(page, "Nutrition");
  await page.getByRole("button", { name: "Scan a barcode" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Camera permission was denied",
  );
  await expect(
    page.getByLabel("Product barcode", { exact: true }),
  ).toBeVisible();
});

test("camera decodes an EAN barcode once and releases tracks on scan and navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state: { track: MediaStreamTrack | null; showBarcode: boolean } = {
      track: null,
      showBarcode: true,
    };
    Object.defineProperty(window, "__testCamera", { value: state });
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d")!;
      const left = [
        "0001101",
        "0011001",
        "0010011",
        "0111101",
        "0100011",
        "0110001",
        "0101111",
        "0111011",
        "0110111",
        "0001011",
      ];
      const code = "3017620422003";
      const parity = "LLGGGL";
      const invert = (s: string) =>
        s.replace(/[01]/g, (c) => (c === "1" ? "0" : "1"));
      let bits = "101";
      for (let i = 1; i <= 6; i++)
        bits +=
          parity[i - 1] === "L"
            ? left[Number(code[i])]
            : invert(left[Number(code[i])]).split("").reverse().join("");
      bits += "01010";
      for (let i = 7; i < 13; i++) bits += invert(left[Number(code[i])]);
      bits += "101";
      const stream = canvas.captureStream(15);
      const track = stream.getVideoTracks()[0];
      state.track = track;
      const draw = () => {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = "#000";
        if (state.showBarcode)
          [...bits].forEach((bit, i) => {
            if (bit === "1") ctx.fillRect(130 + i * 4, 120, 4, 240);
          });
        if (track.readyState === "live") requestAnimationFrame(draw);
      };
      draw();
      return stream;
    };
  });
  let lookups = 0;
  await page.route("**/api/products/3017620422003", (route) => {
    lookups++;
    return route.fulfill({
      json: {
        barcode: "3017620422003",
        name: "Camera test product",
        brand: "",
        ingredients: "",
        allergens: "",
        grade: "",
        serving: "",
        basis: "100g / 100ml",
        source: "openfoodfacts",
        nutrients: [],
      },
    });
  });
  await demo(page);
  await nav(page, "Nutrition");
  await page.getByRole("button", { name: "Scan a barcode" }).click();
  await expect(
    page.getByRole("heading", { name: "Camera test product" }),
  ).toBeVisible();
  expect(lookups).toBe(1);
  const cameraState = () =>
    page.evaluate(
      () =>
        (window as unknown as { __testCamera: { track: MediaStreamTrack } })
          .__testCamera.track.readyState,
    );
  expect(await cameraState()).toBe("ended");
  await page.evaluate(() => {
    (
      window as unknown as { __testCamera: { showBarcode: boolean } }
    ).__testCamera.showBarcode = false;
  });
  await page.getByRole("button", { name: "Scan a barcode" }).click();
  await expect.poll(cameraState).toBe("live");
  await nav(page, "Overview");
  expect(await cameraState()).toBe("ended");
});

test("blocked storage gives a visible session-only warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Browser storage is unavailable",
  );
  await page.getByRole("button", { name: "Explore demo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your daily snapshot" }),
  ).toBeVisible();
});

test("mobile navigation and all screens fit a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await demo(page);
  for (const name of ["Today", "Sleep", "Move", "Breathe", "Reminders", "Food"]) {
    await page
      .locator(".mobile-nav")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Today", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/wellnest-mobile.png",
    fullPage: true,
  });
});

test("keyboard entry and accessibility on every screen", async ({ page }) => {
  await demo(page);
  for (const name of [
    "Overview",
    "Sleep",
    "Movement",
    "Breathe",
    "Reminders",
    "Nutrition",
  ]) {
    await nav(page, name);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await nav(page, "Sleep");
  await page.getByRole("button", { name: "Log sleep", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await nav(page, "Reminders");
  await page.getByRole("button", { name: "Add reminder", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await nav(page, "Nutrition");
  await page
    .getByRole("button", { name: "Explore sample", exact: true })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await nav(page, "Overview");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Use my own data" }),
  ).toBeFocused();
  await page.screenshot({
    path: "test-results/wellnest-desktop.png",
    fullPage: true,
  });
});
