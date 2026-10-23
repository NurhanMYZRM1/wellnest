import { NextResponse } from "next/server";
import { normalizeProduct } from "@/lib/products";

export async function GET(
  _request: Request,
  context: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await context.params;
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(barcode))
    return NextResponse.json(
      { error: "Enter an 8, 12, 13, or 14-digit product barcode." },
      { status: 400 },
    );
  try {
    const fields =
      "product_name,brands,image_front_url,ingredients_text,allergens_tags,nutrition_grades,serving_size,nutriments";
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`,
      {
        headers: {
          "User-Agent":
            "Wellnest-Hackathon/1.0 (personal wellness barcode lookup)",
        },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 404)
      return NextResponse.json(
        {
          error:
            "This barcode is not in Open Food Facts yet. Try another product or explore the sample.",
        },
        { status: 404 },
      );
    if (!response.ok) throw new Error("Upstream unavailable");
    const data = await response.json();
    if (data.status === 0)
      return NextResponse.json(
        {
          error:
            "This barcode is not in Open Food Facts yet. Try another product or explore the sample.",
        },
        { status: 404 },
      );
    if (data.status !== 1 || !data.product || typeof data.product !== "object")
      throw new Error("Invalid upstream response");
    return NextResponse.json(normalizeProduct(data.product, barcode), {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Product lookup is temporarily unavailable. Please try again, or use the sample product.",
      },
      { status: 503 },
    );
  }
}
