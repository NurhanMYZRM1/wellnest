import type { Product } from "./wellness";

type RawProduct = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
export function normalizeProduct(raw: RawProduct, barcode: string): Product {
  const n =
    raw.nutriments && typeof raw.nutriments === "object"
      ? (raw.nutriments as Record<string, unknown>)
      : {};
  const tags = Array.isArray(raw.allergens_tags)
    ? raw.allergens_tags
        .filter((t) => typeof t === "string")
        .map((t) => t.replace(/^[a-z]{2}:/, "").replaceAll("-", " "))
        .join(", ")
    : "";
  const nutrients = [
    ["Energy", "energy-kcal", "kcal"],
    ["Fat", "fat", "g"],
    ["Saturated fat", "saturated-fat", "g"],
    ["Carbohydrates", "carbohydrates", "g"],
    ["Sugars", "sugars", "g"],
    ["Fibre", "fiber", "g"],
    ["Protein", "proteins", "g"],
    ["Salt", "salt", "g"],
  ].map(([label, key, unit]) => ({
    label,
    unit,
    per100: number(n[`${key}_100g`]),
    perServing: number(n[`${key}_serving`]),
  }));
  const image = text(raw.image_front_url);
  return {
    barcode,
    name: text(raw.product_name) || "Unnamed product",
    brand: text(raw.brands),
    image: image.startsWith("https://images.openfoodfacts.org/")
      ? image
      : undefined,
    ingredients: text(raw.ingredients_text),
    allergens: tags,
    grade: /^[a-e]$/.test(text(raw.nutrition_grades))
      ? text(raw.nutrition_grades)
      : "",
    serving: text(raw.serving_size),
    basis: "100g / 100ml",
    nutrients,
    source: "openfoodfacts",
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
  };
}
