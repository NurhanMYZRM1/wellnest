"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Flower2,
  Heart,
  LayoutGrid,
  Leaf,
  Menu,
  Moon,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import {
  demoData,
  emptyData,
  isDue,
  pages,
  parseStored,
  reconcileOccurrences,
  type Mode,
  type Page,
  type WellnessData,
} from "@/lib/wellness";
import { timerText, useActiveTimer } from "./shared";
import { Overview } from "./overview";
import { SleepPage } from "./sleep";
import { MovementPage } from "./movement";
import { BreathePage, useBreathSession } from "./breathe";
import { RemindersPage } from "./reminders";
import { NutritionPage } from "./nutrition";

// `tab` is the single-word label for the phone tab bar (HIG tab bars: "Use single words").
const navigation = [
  {
    page: "overview" as Page,
    label: "Overview",
    tab: "Today",
    icon: LayoutGrid,
  },
  { page: "sleep" as Page, label: "Sleep", tab: "Sleep", icon: Moon },
  { page: "movement" as Page, label: "Movement", tab: "Move", icon: Activity },
  { page: "breathe" as Page, label: "Breathe", tab: "Breathe", icon: Flower2 },
  {
    page: "reminders" as Page,
    label: "Reminders",
    tab: "Reminders",
    icon: Bell,
  },
  {
    page: "nutrition" as Page,
    label: "Nutrition",
    tab: "Food",
    icon: ScanLine,
  },
];
const storageKey = (mode: Mode) => `wellnest:v1:${mode}`;
const pageFromUrl = (): Page =>
  pages.find((p) => location.pathname === `/${p}`) ?? "overview";

export default function WellnessApp() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("personal");
  const [onboarded, setOnboarded] = useState(false);
  const [data, setData] = useState<WellnessData>(emptyData);
  const [page, setPage] = useState<Page>("overview");
  const [logSleep, setLogSleep] = useState(false);
  const [menu, setMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    undo?: () => void;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const toastId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeToSave = useRef(true);
  const workTimer = useActiveTimer();
  const breath = useBreathSession();
  const pauseBreath = breath.timer.pause;
  const [lastBreak, setLastBreak] = useState(0);
  const heading = useRef<HTMLElement>(null);

  useEffect(() => {
    // Browser storage is an external source: hydrate it once after SSR.
    try {
      const chosen = localStorage.getItem("wellnest:mode");
      const initialMode: Mode = chosen === "demo" ? "demo" : "personal";
      const raw = localStorage.getItem(storageKey(initialMode));
      const loaded = raw
        ? parseStored(raw)
        : initialMode === "demo"
          ? demoData()
          : emptyData();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial browser-only persistence hydration.
      setMode(initialMode);
      setPage(pageFromUrl());
      setData(reconcileOccurrences(loaded));
      setOnboarded(chosen === "demo" || chosen === "personal");
    } catch {
      safeToSave.current = false;
      setStorageError(
        "Browser storage is unavailable or saved data could not be read. You can explore in this session; existing records will not be overwritten.",
      );
    }
    setReady(true);
    const tick = () => {
      setNow(new Date());
      setData((d) => reconcileOccurrences(d));
    };
    const interval = setInterval(tick, 10000);
    const visible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      if (toastId.current) clearTimeout(toastId.current);
    };
  }, []);

  useEffect(() => {
    // Back/forward follows the URL; leaving Breathe pauses the session instead of letting it run unseen.
    const onPop = () => {
      const next = pageFromUrl();
      setPage(next);
      if (next !== "breathe") pauseBreath();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pauseBreath]);

  useEffect(() => {
    if (!ready || !onboarded || !safeToSave.current) return;
    try {
      localStorage.setItem(storageKey(mode), JSON.stringify(data));
      localStorage.setItem("wellnest:mode", mode);
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Surface a failed external storage write.
      setStorageError(
        "Your browser could not save these changes. Records will only last for this session.",
      );
    }
  }, [data, mode, ready, onboarded]);

  const notify = (message: string, undo?: () => void) => {
    setToast({ message, undo });
    if (toastId.current) clearTimeout(toastId.current);
    toastId.current = setTimeout(() => setToast(null), undo ? 8000 : 4500);
  };
  const chooseMode = (nextMode: Mode, reset = false) => {
    workTimer.reset();
    breath.timer.reset();
    breath.setCompleted(false);
    setLastBreak(0);
    // A deep link opened before onboarding keeps its section.
    if (onboarded && page !== "overview") {
      setPage("overview");
      window.history.pushState(null, "", "/");
    }
    setProfileOpen(false);
    try {
      const raw =
        !reset && safeToSave.current
          ? localStorage.getItem(storageKey(nextMode))
          : null;
      setData(
        reconcileOccurrences(
          raw
            ? parseStored(raw)
            : nextMode === "demo"
              ? demoData()
              : emptyData(),
        ),
      );
    } catch {
      setData(nextMode === "demo" ? demoData() : emptyData());
      safeToSave.current = false;
      setStorageError(
        "Saved records could not be loaded. Changes in this session will not overwrite them.",
      );
    }
    setMode(nextMode);
    setOnboarded(true);
    if (reset) notify("Demo reset with a fresh week of sample records.");
  };
  const navigate = (next: Page, logSleepNow = false) => {
    if (page === "breathe" && next !== "breathe" && breath.timer.running) {
      breath.timer.pause();
      notify(
        `Breathing paused with ${timerText(breath.duration * 60 - breath.timer.seconds)} left. Resume it any time from Breathe.`,
      );
    }
    setLogSleep(logSleepNow);
    setPage(next);
    if (next !== page)
      window.history.pushState(
        null,
        "",
        next === "overview" ? "/" : `/${next}`,
      );
    setMenu(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  };
  const dueCount = data.occurrences.filter((o) => isDue(o, now)).length;
  const breakDue =
    workTimer.seconds - lastBreak >= data.settings.breakMinutes * 60;
  const props = { data, setData, now, notify };

  if (!ready)
    return (
      <div className="loading-screen">
        <div className="brand">
          <span className="brand-icon">
            <Leaf />
          </span>
          wellnest<span className="brand-dot">.</span>
        </div>
        <p>Making a little room for you…</p>
      </div>
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {menu && (
        <button
          aria-label="Close navigation"
          className="sidebar-scrim"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={`sidebar ${menu ? "mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Wellnest overview"
        >
          <span className="brand-icon">
            <Leaf size={25} />
          </span>
          wellnest<span className="brand-dot">.</span>
        </button>
        <nav>
          {navigation.map(({ page: p, label, icon: Icon }) => (
            <button
              key={p}
              className={`nav-item ${page === p ? "active" : ""}`}
              aria-label={label}
              onClick={() => navigate(p)}
              aria-current={page === p ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {p === "reminders" && dueCount > 0 && (
                <span className="nav-count">{dueCount}</span>
              )}
              {page === p && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={15} />
            Your space. Your data.
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              My wellbeing <span>/</span>{" "}
              <strong>{navigation.find((n) => n.page === page)?.label}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="local-badge">
              <span />
              {storageError ? "Session only" : "Saved on this device"}
            </span>
            <button
              className="notification-button"
              aria-label={`Open reminders, ${dueCount} due`}
              onClick={() => navigate("reminders")}
            >
              <Bell size={19} />
              {dueCount > 0 && <i />}
            </button>
            <div className="profile-container">
              <button
                className="profile-button"
                aria-expanded={profileOpen}
                aria-controls="profile-menu"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar">
                  <Leaf size={17} />
                </span>
                <span>{mode === "demo" ? "Demo space" : "My space"}</span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="profile-menu" id="profile-menu">
                  <strong>Your wellbeing space</strong>
                  <p>
                    {mode === "demo"
                      ? "You’re exploring sample records."
                      : "Your records stay in this browser."}
                  </p>
                  <button
                    onClick={() =>
                      chooseMode(mode === "demo" ? "personal" : "demo")
                    }
                  >
                    {mode === "demo"
                      ? "Switch to my personal space"
                      : "Explore the demo"}
                    <ArrowRight size={14} />
                  </button>
                  {mode === "demo" && (
                    <button onClick={() => chooseMode("demo", true)}>
                      Reset demo records
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} ref={heading}>
          {storageError && (
            <div className="notice warning" role="alert">
              {storageError}
            </div>
          )}
          {mode === "demo" && onboarded && (
            <div className="demo-banner">
              <span>
                <Sparkles size={14} />
                <strong>Demo space</strong>
              </span>
              <button onClick={() => chooseMode("personal")}>
                Use my own data
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          {breakDue && (
            <div className="notice" role="status">
              <Activity size={18} />
              <span>
                A little movement goes a long way. Your stretch break is ready.
              </span>
              <button
                className="text-button"
                onClick={() => navigate("movement")}
              >
                Take a break
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {!onboarded ? (
            <div className="welcome-panel">
              <div className="welcome-art">
                <Sun size={50} strokeWidth={1} />
                <div className="welcome-orbit">
                  <Leaf size={80} strokeWidth={1} />
                </div>
                <Heart size={30} strokeWidth={1} />
              </div>
              <h1>
                Make room
                <br />
                for your wellbeing.
              </h1>
              <p>
                Better rest. Mindful moments. Small habits that add up.
                <br />
                Your daily care starts right here.
              </p>
              <div className="welcome-actions">
                <button
                  className="primary-button"
                  onClick={() => chooseMode("personal")}
                >
                  Start fresh
                  <ArrowRight size={17} />
                </button>
                <button
                  className="secondary-button"
                  onClick={() => chooseMode("demo")}
                >
                  Explore demo
                  <Sparkles size={16} />
                </button>
              </div>
              <div className="welcome-features">
                <span>
                  <Moon size={16} />
                  Sleep
                </span>
                <span>
                  <Activity size={16} />
                  Move
                </span>
                <span>
                  <Flower2 size={16} />
                  Breathe
                </span>
                <span>
                  <Bell size={16} />
                  Remember
                </span>
                <span>
                  <ScanLine size={16} />
                  Nourish
                </span>
              </div>
              <small>
                <ShieldCheck size={14} />
                No account needed. Your personal records stay on this device.
              </small>
            </div>
          ) : (
            <>
              {page === "overview" && (
                <Overview
                  {...props}
                  navigate={navigate}
                  workSeconds={workTimer.seconds}
                  startBreathing={() => {
                    if (breath.completed) {
                      breath.timer.reset();
                      breath.setCompleted(false);
                    }
                    breath.timer.start();
                    navigate("breathe");
                  }}
                />
              )}
              {page === "sleep" && <SleepPage {...props} logNow={logSleep} />}
              {page === "movement" && (
                <MovementPage
                  {...props}
                  timer={workTimer}
                  lastBreak={lastBreak}
                  setLastBreak={setLastBreak}
                />
              )}
              {page === "breathe" && (
                <BreathePage {...props} session={breath} />
              )}
              {page === "reminders" && <RemindersPage {...props} />}
              {page === "nutrition" && <NutritionPage {...props} />}
            </>
          )}
        </main>
        {/* Sections only exist after Start fresh / Explore demo; tabs on the welcome screen did nothing. */}
        {onboarded && (
          <nav className="mobile-nav" aria-label="Quick navigation">
            {navigation.map(({ page: p, tab, icon: Icon }) => (
              <button
                key={p}
                className={page === p ? "active" : ""}
                onClick={() => navigate(p)}
                aria-current={page === p ? "page" : undefined}
                aria-describedby={
                  p === "reminders" && dueCount > 0
                    ? "tab-due-count"
                    : undefined
                }
              >
                <Icon size={20} />
                <span>{tab}</span>
                {p === "reminders" && dueCount > 0 && (
                  <span className="tab-badge" aria-hidden="true">
                    {dueCount}
                  </span>
                )}
              </button>
            ))}
            <span id="tab-due-count" hidden>
              {dueCount} due now
            </span>
          </nav>
        )}
      </div>
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={17} />
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                className="toast-undo"
                onClick={() => {
                  toast.undo?.();
                  notify("Undone. Everything is back as it was.");
                }}
              >
                Undo
              </button>
            )}
            <button aria-label="Dismiss message" onClick={() => setToast(null)}>
              <X size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
