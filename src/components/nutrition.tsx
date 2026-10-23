"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import {
  ArrowRight,
  Bookmark,
  Camera,
  Check,
  ExternalLink,
  Leaf,
  LoaderCircle,
  ScanLine,
  Search,
  Sparkles,
  Wheat,
  X,
} from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import {
  clockTime,
  sameDay,
  sampleProduct,
  uid,
  type Product,
} from "@/lib/wellness";
import { PageHeading, SectionTitle, type SharedProps } from "./shared";

export function NutritionPage({ data, setData, now, notify }: SharedProps) {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const stopCamera = useCallback(() => {
    generation.current += 1;
    controls.current?.stop();
    controls.current = null;
    if (video.current?.srcObject instanceof MediaStream)
      video.current.srcObject.getTracks().forEach((track) => track.stop());
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(
    () => () => {
      stopCamera();
      request.current?.abort();
    },
    [stopCamera],
  );
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stopCamera();
        setScanning(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [stopCamera]);
  const lookup = async (code: string) => {
    const clean = code.trim();
    if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(clean)) {
      setError("Enter an 8, 12, 13, or 14-digit product barcode.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setProduct(null);
    setBarcode(clean);
    try {
      const response = await fetch(`/api/products/${clean}`, {
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "We couldn’t look up that product. Please try again.",
        );
      if (!controller.signal.aborted) setProduct(result as Product);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof TypeError
            ? "You appear to be offline. Check your connection, try again, or explore the sample product."
            : err instanceof Error
              ? err.message
              : "Lookup failed. Please try again.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  const startCamera = async () => {
    stopCamera();
    setScanning(true);
    setCameraError("");
    const current = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access needs a supported browser and an HTTPS connection. You can enter the barcode below.",
        );
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (current !== generation.current || !video.current) return;
      let found = false;
      const reader = new BrowserMultiFormatReader();
      const scanner = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        video.current,
        (result, _error, scannerControls) => {
          if (current !== generation.current || found || !result) return;
          const code = result.getText();
          if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return;
          found = true;
          scannerControls.stop();
          stopCamera();
          setScanning(false);
          void lookup(code);
        },
      );
      if (current !== generation.current) scanner.stop();
      else controls.current = scanner;
    } catch (err) {
      if (current !== generation.current) return;
      stopCamera();
      setScanning(false);
      const name = err instanceof Error ? err.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser, or enter the barcode below."
          : name === "NotFoundError"
            ? "No camera was found. You can still enter the barcode below."
            : err instanceof Error
              ? err.message
              : "The camera could not start. Please enter the barcode instead.",
      );
    }
  };
  const showProduct = (p: Product) => {
    request.current?.abort();
    stopCamera();
    setScanning(false);
    setLoading(false);
    setError("");
    setProduct(p);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    stopCamera();
    setScanning(false);
    void lookup(barcode);
  };
  const saved =
    product && data.products.some((p) => p.barcode === product.barcode);
  const eatenToday = data.foodLog.filter((f) => sameDay(f.at, now));
  const logFood = (p: Product) => {
    const entry = {
      id: uid(),
      at: new Date().toISOString(),
      barcode: p.barcode,
      name: p.name,
    };
    setData((d) => ({ ...d, foodLog: [...d.foodLog, entry] }));
    notify(`Logged ${p.name} for today.`, () =>
      setData((d) => ({
        ...d,
        foodLog: d.foodLog.filter((f) => f.id !== entry.id),
      })),
    );
  };
  return (
    <>
      <PageHeading
        eyebrow="A CLOSER LOOK AT EVERYDAY FOOD"
        title="Know what nourishes you."
        description="Scan a barcode and get to know what’s inside."
      />
      <div className="nutrition-layout">
        <section className="panel scanner-panel">
          <SectionTitle title="A little food for thought">
            <span className="icon-tile mint">
              <ScanLine size={20} />
            </span>
          </SectionTitle>
          <div className={`scanner-stage ${scanning ? "camera-on" : ""}`}>
            {scanning ? (
              <>
                <video
                  ref={video}
                  playsInline
                  muted
                  autoPlay
                  aria-label="Barcode camera preview"
                />
                <div className="scanner-frame" aria-hidden="true" />
                <button
                  className="camera-close"
                  aria-label="Stop camera"
                  onClick={() => {
                    stopCamera();
                    setScanning(false);
                  }}
                >
                  <X size={20} />
                </button>
                <span className="scanner-instruction">
                  Hold a product barcode inside the frame
                </span>
              </>
            ) : (
              <>
                <div className="scanner-icon">
                  <ScanLine size={48} strokeWidth={1.2} />
                </div>
                <h3>Good food starts with knowing.</h3>
                <p>Point your camera at the product barcode.</p>
                <button
                  className="primary-button"
                  onClick={() => void startCamera()}
                >
                  <Camera size={17} />
                  Scan a barcode
                </button>
              </>
            )}
          </div>
          {cameraError && (
            <p role="alert" className="form-error">
              {cameraError}
            </p>
          )}
          <div className="or-divider">
            <span />
            or enter it yourself
            <span />
          </div>
          <form onSubmit={submit}>
            <label htmlFor="barcode-input">Product barcode</label>
            <div className="barcode-input">
              <input
                id="barcode-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 3017620422003"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                required
              />
              <button
                className="primary-button"
                type="submit"
                disabled={loading}
                aria-label="Look up barcode"
              >
                {loading ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Search size={18} />
                )}
              </button>
            </div>
          </form>
          {loading && (
            <p className="inline-note" role="status">
              Looking up your product…
            </p>
          )}
          {error && (
            <div className="lookup-error" role="alert">
              <p>{error}</p>
              <button
                className="text-button"
                onClick={() => void lookup(barcode)}
              >
                Try again
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div className="sample-prompt">
            <Sparkles size={18} />
            <div>
              <strong>Just taking a look?</strong>
              <span>Try our sample pantry product.</span>
            </div>
            <button
              className="text-button"
              onClick={() => showProduct(sampleProduct)}
            >
              Explore sample
              <ArrowRight size={15} />
            </button>
          </div>
          <p className="fine-print">
            Only the barcode is sent for lookup. Camera images stay on your
            device.
          </p>
        </section>
        <section className="panel product-panel" aria-live="polite">
          {product ? (
            <>
              <div className="product-source">
                {product.source === "sample" ? (
                  <span className="sample-badge">
                    <Sparkles size={12} />
                    Sample product · illustrative data
                  </span>
                ) : (
                  <span className="inline-badge">
                    <span />
                    Open Food Facts
                  </span>
                )}
                <button
                  className={`icon-button ${saved ? "saved" : ""}`}
                  aria-label={saved ? "Product already saved" : "Save product"}
                  disabled={Boolean(saved)}
                  onClick={() => {
                    setData((d) => ({
                      ...d,
                      products: [
                        product,
                        ...d.products.filter(
                          (p) => p.barcode !== product.barcode,
                        ),
                      ],
                    }));
                    notify("Product saved to your pantry.");
                  }}
                >
                  {saved ? <Check size={19} /> : <Bookmark size={19} />}
                </button>
              </div>
              <div className="product-header">
                <div className="product-image">
                  {product.image ? (
                    <Image
                      src={product.image}
                      width={96}
                      height={112}
                      unoptimized
                      alt={product.name}
                    />
                  ) : (
                    <Wheat size={42} strokeWidth={1.1} />
                  )}
                </div>
                <div>
                  <span className="eyebrow">
                    {product.brand || "Brand unavailable"}
                  </span>
                  <h2>{product.name}</h2>
                  <span className="subtle-label">
                    {product.source === "sample"
                      ? "A little something from the demo pantry"
                      : product.barcode}
                  </span>
                </div>
              </div>
              <div className="nutrition-grade">
                <span>Nutri-Score</span>
                <div className="grade-scale">
                  {["a", "b", "c", "d", "e"].map((grade) => (
                    <span
                      key={grade}
                      className={`${product.grade === grade ? "chosen" : ""} grade-${grade}`}
                    >
                      {grade.toUpperCase()}
                    </span>
                  ))}
                </div>
                {!product.grade && <small>Unavailable</small>}
              </div>
              <SectionTitle title="The nutrition details" />
              <div className="nutrition-table-wrap">
                <table className="nutrition-table">
                  <thead>
                    <tr>
                      <th>Nutrient</th>
                      <th>Per {product.basis}</th>
                      <th>
                        Per serving
                        {product.serving && <small>{product.serving}</small>}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.nutrients.map((n) => (
                      <tr key={n.label}>
                        <th>{n.label}</th>
                        <td>
                          {n.per100 === null
                            ? "Unavailable"
                            : `${n.per100} ${n.unit}`}
                        </td>
                        <td>
                          {n.perServing === null
                            ? "Unavailable"
                            : `${n.perServing} ${n.unit}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ingredient-block">
                <h3>Ingredients</h3>
                <p>
                  {product.ingredients ||
                    "Ingredient information is unavailable for this product."}
                </p>
                <h3>Allergens</h3>
                <p>
                  {product.allergens ||
                    "Allergen information is unavailable. Check the product label."}
                </p>
              </div>
              <button
                className="primary-button full-width"
                onClick={() => logFood(product)}
              >
                <Check size={16} />
                Log as eaten today
              </button>
              {!saved && (
                <button
                  className="secondary-button full-width"
                  onClick={() => {
                    setData((d) => ({
                      ...d,
                      products: [
                        product,
                        ...d.products.filter(
                          (p) => p.barcode !== product.barcode,
                        ),
                      ],
                    }));
                    notify("Product saved to your pantry.");
                  }}
                >
                  <Bookmark size={16} />
                  Save to my pantry
                </button>
              )}
              {product.source === "openfoodfacts" && (
                <p className="product-attribution">
                  <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                    View on Open Food Facts
                    <ExternalLink size={12} />
                  </a>
                  Community-contributed data may be incomplete. Confirm details
                  on the packaging. Per-100 values use grams for solids and
                  millilitres for liquids.
                </p>
              )}
            </>
          ) : (
            <div className="product-placeholder">
              <span className="placeholder-leaf">
                <Leaf size={48} strokeWidth={1} />
              </span>
              <h2>
                Every label
                <br />
                has a story.
              </h2>
              <p>
                Scan a product to explore its nutrients,
                <br />
                ingredients, and allergens.
              </p>
              <div className="placeholder-tags">
                <span>Nutrition</span>
                <span>Ingredients</span>
                <span>Allergens</span>
              </div>
            </div>
          )}
        </section>
      </div>
      {eatenToday.length > 0 && (
        <section className="panel">
          <SectionTitle title="Eaten today">
            <span className="subtle-label">{eatenToday.length} logged</span>
          </SectionTitle>
          <ul className="food-log">
            {eatenToday.map((f) => (
              <li key={f.id}>
                <strong>{f.name}</strong>
                <span>{clockTime(f.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.products.length > 0 && (
        <section className="panel">
          <SectionTitle title="Your little pantry">
            <span className="subtle-label">
              {data.products.length} saved products
            </span>
          </SectionTitle>
          <div className="pantry-grid">
            {data.products.map((p) => (
              <button
                className="pantry-item"
                key={p.barcode}
                onClick={() => showProduct(p)}
              >
                <span className="icon-tile yellow">
                  <Wheat size={23} />
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <span>
                    {p.source === "sample"
                      ? "Sample product"
                      : p.brand || p.barcode}
                  </span>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="nutrition-credit">
        Product data from{" "}
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noreferrer"
        >
          Open Food Facts
        </a>
        , available under the{" "}
        <a
          href="https://opendatacommons.org/licenses/odbl/1-0/"
          target="_blank"
          rel="noreferrer"
        >
          Open Database License
        </a>
        . Product images: CC BY-SA. Sample data is illustrative.
      </p>
    </>
  );
}
