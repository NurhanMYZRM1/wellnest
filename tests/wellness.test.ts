import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dayKey,
  demoData,
  durationMinutes,
  emptyData,
  isDue,
  overlappingSleep,
  parseStored,
  reconcileOccurrences,
  sleepSuggestion,
  uid,
  updateOccurrence,
  validSleep,
  type SleepLog,
} from "../src/lib/wellness";
import { normalizeProduct } from "../src/lib/products";

const now = new Date("2026-10-23T12:00:00+08:00");
const log = (
  hours: number,
  quality = 4,
  wakeTime = "2026-10-23T07:00:00+08:00",
): SleepLog => ({
  id: `sleep-${hours}-${quality}`,
  bedtime: new Date(
    new Date(wakeTime).getTime() - hours * 3600000,
  ).toISOString(),
  wakeTime,
  quality,
});
test("sleep duration correctly crosses midnight", () => {
  assert.equal(durationMinutes(log(8)), 480);
  assert.equal(validSleep(log(8), now), null);
});
test("sleep validation rejects backwards, excessively long, and future records", () => {
  assert.match(validSleep(log(-1), now)!, /after bedtime/);
  assert.match(validSleep(log(25), now)!, /24 hours/);
  assert.match(
    validSleep(log(8, 4, "2026-10-24T07:00:00+08:00"), now)!,
    /already ended/,
  );
});
test("suggestion needs three recent high-quality nights", () => {
  const result = sleepSuggestion(
    [log(7), log(7.5), log(9, 3), log(9, 4, "2026-10-01T07:00:00+08:00")],
    "07:00",
    now,
  );
  assert.equal(result.minutes, 480);
  assert.equal(result.count, 2);
  assert.equal(result.personalized, false);
  assert.equal(result.bedtime, "23:00");
});
test("suggestion takes the median and rounds to fifteen minutes", () => {
  const result = sleepSuggestion([log(7), log(7.6), log(9)], "07:00", now);
  assert.equal(result.minutes, 450);
  assert.equal(result.bedtime, "23:30");
  assert.equal(result.personalized, true);
  assert.equal(
    sleepSuggestion([log(7), log(7.5), log(8), log(9)], "07:00", now).minutes,
    465,
  );
});
test("suggestion is constrained to seven to nine hours and handles midnight", () => {
  assert.equal(
    sleepSuggestion([log(5), log(5.5), log(6)], "05:00", now).minutes,
    420,
  );
  const long = sleepSuggestion([log(10), log(11), log(12)], "09:00", now);
  assert.equal(long.minutes, 540);
  assert.equal(long.bedtime, "00:00");
});
test("reopening creates missed reminder occurrences and is idempotent", () => {
  const d = emptyData();
  d.reminders = [
    {
      id: "vitamin",
      name: "Vitamin",
      note: "",
      times: ["08:00", "20:00"],
      createdAt: "2026-10-20T00:00:00",
      enabled: true,
    },
  ];
  const reconciled = reconcileOccurrences(d, new Date("2026-10-23T12:00:00"));
  assert.equal(reconciled.occurrences.length, 8);
  assert.equal(
    reconcileOccurrences(reconciled, new Date("2026-10-23T12:00:00")),
    reconciled,
  );
  assert.equal(
    reconciled.occurrences.filter((o) =>
      isDue(o, new Date("2026-10-23T12:00:00")),
    ).length,
    7,
  );
});
test("taken is idempotent and undo restores the occurrence", () => {
  const d = emptyData();
  d.occurrences = [
    {
      id: "r1",
      reminderId: "r",
      name: "Vitamin",
      note: "",
      scheduledAt: now.toISOString(),
    },
  ];
  const once = updateOccurrence(d, "r1", "take", now);
  const twice = updateOccurrence(
    once,
    "r1",
    "take",
    new Date(now.getTime() + 1000),
  );
  assert.equal(twice.occurrences[0].takenAt, now.toISOString());
  assert.equal(
    updateOccurrence(once, "r1", "undo").occurrences[0].takenAt,
    undefined,
  );
  assert.equal(
    updateOccurrence(once, "r1", "later").occurrences[0].snoozedUntil,
    undefined,
  );
});
test("snooze crosses midnight without changing the daily schedule", () => {
  const time = new Date("2026-10-23T23:55:00");
  const d = emptyData();
  d.reminders = [
    {
      id: "r",
      name: "Vitamin",
      note: "",
      times: ["23:50"],
      createdAt: "2026-10-23T00:00:00",
      enabled: true,
    },
  ];
  const original = reconcileOccurrences(d, time);
  const id = original.occurrences[0].id;
  const snoozed = updateOccurrence(original, id, "later", time);
  assert.equal(dayKey(snoozed.occurrences[0].snoozedUntil!), "2026-10-24");
  assert.equal(
    isDue(snoozed.occurrences[0], new Date("2026-10-24T00:09:00")),
    false,
  );
  assert.equal(
    isDue(snoozed.occurrences[0], new Date("2026-10-24T00:10:00")),
    true,
  );
  const nextDay = reconcileOccurrences(
    snoozed,
    new Date("2026-10-24T00:10:00"),
  );
  assert.equal(nextDay.occurrences.length, 2);
  assert.deepEqual(nextDay.reminders[0].times, ["23:50"]);
  assert.equal(
    nextDay.occurrences[0].snoozedUntil,
    snoozed.occurrences[0].snoozedUntil,
  );
});
test("stopped reminders do not generate future occurrences", () => {
  const d = emptyData();
  d.reminders = [
    {
      id: "r",
      name: "Vitamin",
      note: "",
      times: ["08:00"],
      createdAt: "2026-10-20T00:00:00",
      enabled: false,
    },
  ];
  assert.equal(reconcileOccurrences(d, now).occurrences.length, 0);
});
test("demo includes seven distinct completed nights even early in the morning", () => {
  const early = new Date("2026-10-23T02:00:00");
  const d = demoData(early);
  assert.equal(new Set(d.sleep.map((l) => dayKey(l.wakeTime))).size, 7);
  assert.ok(d.sleep.every((l) => new Date(l.wakeTime) <= early));
  assert.equal(parseStored(JSON.stringify(d)).version, 1);
  assert.equal(emptyData().sleep.length, 0);
});
test("malformed storage is rejected, not silently overwritten", () => {
  assert.throws(() => parseStored("{"));
  assert.throws(() => parseStored('{"version":2}'));
  assert.throws(() =>
    parseStored(JSON.stringify({ ...emptyData(), sleep: [{}] })),
  );
});
test("product normalization preserves missing nutrients and unknown allergens", () => {
  const p = normalizeProduct(
    {
      product_name: "Oats",
      nutriments: { proteins_100g: 12, salt_100g: 0, fat_serving: -1 },
    },
    "12345678",
  );
  assert.equal(p.nutrients.find((n) => n.label === "Protein")?.per100, 12);
  assert.equal(p.nutrients.find((n) => n.label === "Salt")?.per100, 0);
  assert.equal(p.nutrients.find((n) => n.label === "Energy")?.per100, null);
  assert.equal(p.nutrients.find((n) => n.label === "Fat")?.perServing, null);
  assert.equal(p.allergens, "");
  assert.equal(p.grade, "");
});
test("overlapping sleep is detected, edits of the same record are not", () => {
  const night = log(8);
  const again = { ...log(7.5), id: "again" };
  assert.equal(overlappingSleep([night], again), night);
  assert.equal(overlappingSleep([night], { ...again, id: night.id }), undefined);
  const nextNight = { ...log(8, 4, "2026-10-24T07:00:00+08:00"), id: "next" };
  assert.equal(overlappingSleep([night], nextNight), undefined);
});
test("skipped reminders stop being due and can be undone", () => {
  const d = reconcileOccurrences(
    {
      ...emptyData(),
      reminders: [
        {
          id: "r",
          name: "Vitamin",
          note: "",
          times: ["08:00"],
          createdAt: "2026-10-21T00:00:00+08:00",
          enabled: true,
        },
      ],
    },
    now,
  );
  const old = d.occurrences[0];
  const skipped = updateOccurrence(d, old.id, "skip", now);
  assert.ok(!isDue(skipped.occurrences[0], now));
  assert.equal(parseStored(JSON.stringify(skipped)).occurrences.length, 3);
  const undone = updateOccurrence(skipped, old.id, "undo", now);
  assert.ok(isDue(undone.occurrences[0], now));
});
test("records saved before the food log existed still load", () => {
  const { foodLog, ...legacy } = emptyData();
  void foodLog;
  assert.deepEqual(parseStored(JSON.stringify(legacy)).foodLog, []);
  assert.throws(() =>
    parseStored(JSON.stringify({ ...emptyData(), foodLog: [{}] })),
  );
});
test("ids are unique even where randomUUID is unavailable (plain-http LAN)", () => {
  Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  try {
    const ids = new Set(Array.from({ length: 50 }, uid));
    assert.equal(ids.size, 50);
    assert.match([...ids][0], /^[0-9a-f]{32}$/);
  } finally {
    delete (crypto as { randomUUID?: unknown }).randomUUID;
  }
  assert.equal(typeof crypto.randomUUID, "function");
});
