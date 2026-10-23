export type Mode = "personal" | "demo";
export const pages = [
  "overview",
  "sleep",
  "movement",
  "breathe",
  "reminders",
  "nutrition",
] as const;
export type Page = (typeof pages)[number];
export type SleepLog = {
  id: string;
  bedtime: string;
  wakeTime: string;
  quality: number;
};
export type Activity = {
  id: string;
  at: string;
  kind: "posture" | "break" | "workout";
  name: string;
  minutes: number;
};
export type WorkSession = { id: string; at: string; seconds: number };
export type BreathSession = { id: string; at: string; minutes: number };
export type Reminder = {
  id: string;
  name: string;
  note: string;
  times: string[];
  createdAt: string;
  enabled: boolean;
};
export type Occurrence = {
  id: string;
  reminderId: string;
  name: string;
  note: string;
  scheduledAt: string;
  takenAt?: string;
  snoozedUntil?: string;
  skippedAt?: string;
};
export type FoodEntry = { id: string; at: string; barcode: string; name: string };
export type Nutrient = {
  label: string;
  unit: string;
  per100: number | null;
  perServing: number | null;
};
export type Product = {
  barcode: string;
  name: string;
  brand: string;
  image?: string;
  ingredients: string;
  allergens: string;
  grade: string;
  serving: string;
  basis: "100g" | "100ml" | "100g / 100ml";
  nutrients: Nutrient[];
  source: "openfoodfacts" | "sample";
  sourceUrl?: string;
};
export type WellnessData = {
  version: 1;
  settings: { wakeTime: string; breakMinutes: number };
  sleep: SleepLog[];
  activities: Activity[];
  work: WorkSession[];
  breathing: BreathSession[];
  reminders: Reminder[];
  occurrences: Occurrence[];
  products: Product[];
  foodLog: FoodEntry[];
};

// randomUUID exists only in secure contexts (HTTPS, localhost); a phone on the LAN dev URL has neither.
export const uid = (): string =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
export const dayKey = (date: Date | string = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const localInput = (date: Date) =>
  `${dayKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
export const atTime = (day: string, time: string) =>
  new Date(`${day}T${time}:00`);
export const daysAgo = (days: number, now = new Date()) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
};
export const sameDay = (a: string, b = new Date()) => dayKey(a) === dayKey(b);
export const minutesAsHours = (minutes: number) =>
  `${Math.floor(minutes / 60)}h${Math.round(minutes % 60) ? ` ${Math.round(minutes % 60)}m` : ""}`;
export const clockTime = (date: string | Date) =>
  new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const durationMinutes = (log: SleepLog) =>
  (new Date(log.wakeTime).getTime() - new Date(log.bedtime).getTime()) / 60000;
export const emptyData = (): WellnessData => ({
  version: 1,
  settings: { wakeTime: "07:00", breakMinutes: 30 },
  sleep: [],
  activities: [],
  work: [],
  breathing: [],
  reminders: [],
  occurrences: [],
  products: [],
  foodLog: [],
});

export function validSleep(log: SleepLog, now = new Date()): string | null {
  const duration = durationMinutes(log);
  if (!Number.isFinite(duration) || duration <= 0)
    return "Wake-up must be after bedtime. Check both dates.";
  if (duration > 24 * 60) return "A sleep record must be 24 hours or less.";
  if (new Date(log.wakeTime) > now)
    return "Log a night that has already ended.";
  if (log.quality < 1 || log.quality > 5)
    return "Choose a sleep quality from 1 to 5.";
  return null;
}

// Another record whose time range intersects this one (same id = the record being edited).
export const overlappingSleep = (logs: SleepLog[], log: SleepLog) =>
  logs.find(
    (l) =>
      l.id !== log.id &&
      new Date(l.bedtime) < new Date(log.wakeTime) &&
      new Date(log.bedtime) < new Date(l.wakeTime),
  );

export function sleepSuggestion(
  logs: SleepLog[],
  wakeTime: string,
  now = new Date(),
) {
  const cutoff = daysAgo(14, now).getTime();
  const good = logs
    .filter(
      (l) =>
        !validSleep(l, now) &&
        l.quality >= 4 &&
        new Date(l.wakeTime).getTime() >= cutoff,
    )
    .sort((a, b) => durationMinutes(a) - durationMinutes(b));
  let minutes = 480;
  if (good.length >= 3) {
    const middle = Math.floor(good.length / 2);
    const median =
      good.length % 2
        ? durationMinutes(good[middle])
        : (durationMinutes(good[middle - 1]) + durationMinutes(good[middle])) /
          2;
    minutes = Math.min(540, Math.max(420, Math.round(median / 15) * 15));
  }
  const [h, m] = wakeTime.split(":").map(Number);
  const bedtime = (h * 60 + m - minutes + 1440) % 1440;
  return {
    minutes,
    count: good.length,
    personalized: good.length >= 3,
    bedtime: `${String(Math.floor(bedtime / 60)).padStart(2, "0")}:${String(bedtime % 60).padStart(2, "0")}`,
  };
}

// Occurrences have stable IDs; reconciling never replaces Taken or snoozed records.
export function reconcileOccurrences(
  data: WellnessData,
  now = new Date(),
): WellnessData {
  const known = new Set(data.occurrences.map((o) => o.id));
  const additions: Occurrence[] = [];
  for (const reminder of data.reminders.filter((r) => r.enabled)) {
    const cursor = atTime(dayKey(reminder.createdAt), "00:00");
    const end = atTime(dayKey(now), "00:00");
    while (cursor <= end) {
      for (const time of reminder.times) {
        const scheduled = atTime(dayKey(cursor), time);
        if (scheduled.getTime() < new Date(reminder.createdAt).getTime())
          continue;
        const id = `${reminder.id}:${dayKey(cursor)}:${time}`;
        if (!known.has(id)) {
          additions.push({
            id,
            reminderId: reminder.id,
            name: reminder.name,
            note: reminder.note,
            scheduledAt: scheduled.toISOString(),
          });
          known.add(id);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return additions.length
    ? { ...data, occurrences: [...data.occurrences, ...additions] }
    : data;
}

export function updateOccurrence(
  data: WellnessData,
  id: string,
  action: "take" | "later" | "skip" | "undo",
  now = new Date(),
): WellnessData {
  return {
    ...data,
    occurrences: data.occurrences.map((o) => {
      if (o.id !== id) return o;
      if (action === "undo")
        return {
          ...o,
          takenAt: undefined,
          snoozedUntil: undefined,
          skippedAt: undefined,
        };
      if (o.takenAt || o.skippedAt) return o;
      if (action === "take")
        return { ...o, takenAt: now.toISOString(), snoozedUntil: undefined };
      if (action === "skip")
        return { ...o, skippedAt: now.toISOString(), snoozedUntil: undefined };
      return {
        ...o,
        snoozedUntil: new Date(now.getTime() + 15 * 60000).toISOString(),
      };
    }),
  };
}
export const isDue = (o: Occurrence, now = new Date()) =>
  !o.takenAt && !o.skippedAt && new Date(o.snoozedUntil || o.scheduledAt) <= now;

export const sampleProduct: Product = {
  barcode: "DEMO-OATS",
  name: "Wholegrain rolled oats",
  brand: "Wellnest demo pantry",
  ingredients: "100% wholegrain oats.",
  allergens: "Oats (gluten). Sample data; check the actual package.",
  grade: "",
  serving: "40 g",
  basis: "100g",
  source: "sample",
  nutrients: [
    { label: "Energy", unit: "kcal", per100: 375, perServing: 150 },
    { label: "Fat", unit: "g", per100: 7.5, perServing: 3 },
    { label: "Saturated fat", unit: "g", per100: 1.3, perServing: 0.52 },
    { label: "Carbohydrates", unit: "g", per100: 60, perServing: 24 },
    { label: "Sugars", unit: "g", per100: 1, perServing: 0.4 },
    { label: "Fibre", unit: "g", per100: 10, perServing: 4 },
    { label: "Protein", unit: "g", per100: 12, perServing: 4.8 },
    { label: "Salt", unit: "g", per100: 0.01, perServing: 0.004 },
  ],
};

export function demoData(now = new Date()): WellnessData {
  const d = emptyData();
  const hours = [7.25, 8, 6.5, 7.75, 8.25, 7, 8];
  const latestWake = atTime(dayKey(now), "07:00");
  if (latestWake > now) latestWake.setDate(latestWake.getDate() - 1);
  d.sleep = hours.map((hours, i) => {
    const wake = daysAgo(6 - i, latestWake);
    return {
      id: `demo-sleep-${i}`,
      wakeTime: wake.toISOString(),
      bedtime: new Date(wake.getTime() - hours * 3600000).toISOString(),
      quality: [3, 4, 2, 4, 5, 3, 5][i],
    };
  });
  d.activities = [
    {
      id: "demo-walk",
      at: now.toISOString(),
      kind: "workout",
      name: "Morning walk",
      minutes: 20,
    },
    {
      id: "demo-posture",
      at: now.toISOString(),
      kind: "posture",
      name: "Posture check-in",
      minutes: 0,
    },
    {
      id: "demo-break",
      at: now.toISOString(),
      kind: "break",
      name: "Stretch break",
      minutes: 2,
    },
  ];
  d.work = [{ id: "demo-work", at: now.toISOString(), seconds: 2700 }];
  d.breathing = [{ id: "demo-breathe", at: now.toISOString(), minutes: 3 }];
  const dueTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  d.reminders = [
    {
      id: "demo-vitamin",
      name: "Daily vitamin",
      note: "Sample reminder · follow your own label",
      times: [dueTime],
      createdAt: atTime(dayKey(daysAgo(6, now)), "00:00").toISOString(),
      enabled: true,
    },
    {
      id: "demo-supplement",
      name: "Evening supplement",
      note: "Sample reminder",
      times: ["20:00"],
      createdAt: atTime(dayKey(now), "00:00").toISOString(),
      enabled: true,
    },
  ];
  const result = reconcileOccurrences(d, now);
  result.occurrences = result.occurrences.map((o, i) =>
    !sameDay(o.scheduledAt, now) && i !== 2
      ? { ...o, takenAt: o.scheduledAt }
      : o,
  );
  result.products = [sampleProduct];
  result.foodLog = [
    {
      id: "demo-food",
      at: now.toISOString(),
      barcode: sampleProduct.barcode,
      name: sampleProduct.name,
    },
  ];
  return result;
}

// Reject malformed storage instead of silently crashing or overwriting it.
export function parseStored(raw: string): WellnessData {
  const d = JSON.parse(raw) as WellnessData;
  // Records saved before the food log existed have no foodLog field.
  if (d && typeof d === "object" && d.foodLog === undefined) d.foodLog = [];
  const date = (s: unknown) =>
    typeof s === "string" && Number.isFinite(new Date(s).getTime());
  const str = (s: unknown) => typeof s === "string";
  const num = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  const time = (s: unknown) =>
    str(s) && /^([01]\d|2[0-3]):[0-5]\d$/.test(s as string);
  if (
    !d ||
    d.version !== 1 ||
    !d.settings ||
    !time(d.settings.wakeTime) ||
    !num(d.settings.breakMinutes) ||
    d.settings.breakMinutes < 1 ||
    !Array.isArray(d.sleep) ||
    !d.sleep.every(
      (l) =>
        l &&
        str(l.id) &&
        date(l.bedtime) &&
        date(l.wakeTime) &&
        num(l.quality) &&
        l.quality >= 1 &&
        l.quality <= 5 &&
        durationMinutes(l) > 0 &&
        durationMinutes(l) <= 1440,
    ) ||
    !Array.isArray(d.activities) ||
    !d.activities.every(
      (a) =>
        a &&
        str(a.id) &&
        date(a.at) &&
        ["posture", "break", "workout"].includes(a.kind) &&
        str(a.name) &&
        num(a.minutes),
    ) ||
    !Array.isArray(d.work) ||
    !d.work.every((w) => w && str(w.id) && date(w.at) && num(w.seconds)) ||
    !Array.isArray(d.breathing) ||
    !d.breathing.every((b) => b && str(b.id) && date(b.at) && num(b.minutes)) ||
    !Array.isArray(d.reminders) ||
    !d.reminders.every(
      (r) =>
        r &&
        str(r.id) &&
        str(r.name) &&
        str(r.note) &&
        Array.isArray(r.times) &&
        r.times.every(time) &&
        date(r.createdAt) &&
        typeof r.enabled === "boolean",
    ) ||
    !Array.isArray(d.occurrences) ||
    !d.occurrences.every(
      (o) =>
        o &&
        str(o.id) &&
        str(o.reminderId) &&
        str(o.name) &&
        str(o.note) &&
        date(o.scheduledAt) &&
        (!o.takenAt || date(o.takenAt)) &&
        (!o.snoozedUntil || date(o.snoozedUntil)) &&
        (!o.skippedAt || date(o.skippedAt)),
    )
  )
    throw new Error("Saved records could not be read.");
  if (
    !Array.isArray(d.products) ||
    !d.products.every(
      (p) =>
        p &&
        str(p.barcode) &&
        str(p.name) &&
        str(p.brand) &&
        str(p.ingredients) &&
        str(p.allergens) &&
        str(p.grade) &&
        str(p.serving) &&
        ["sample", "openfoodfacts"].includes(p.source) &&
        ["100g", "100ml", "100g / 100ml"].includes(p.basis) &&
        Array.isArray(p.nutrients) &&
        p.nutrients.every(
          (n) =>
            n &&
            str(n.label) &&
            str(n.unit) &&
            (n.per100 === null || num(n.per100)) &&
            (n.perServing === null || num(n.perServing)),
        ),
    )
  )
    throw new Error("Saved products could not be read.");
  if (
    !Array.isArray(d.foodLog) ||
    !d.foodLog.every(
      (f) => f && str(f.id) && date(f.at) && str(f.barcode) && str(f.name),
    )
  )
    throw new Error("Saved food log could not be read.");
  return d;
}
