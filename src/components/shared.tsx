"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Pill,
  SkipForward,
  Undo2,
  X,
} from "lucide-react";
import {
  clockTime,
  dayKey,
  daysAgo,
  durationMinutes,
  isDue,
  minutesAsHours,
  sameDay,
  updateOccurrence,
  type Occurrence,
  type Page,
  type WellnessData,
} from "@/lib/wellness";

export type SharedProps = {
  data: WellnessData;
  setData: Dispatch<SetStateAction<WellnessData>>;
  now: Date;
  notify: (message: string, undo?: () => void) => void;
};
export type Navigate = (page: Page, logSleep?: boolean) => void;

export function useActiveTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const last = useRef(0);
  // Stable so callers can pause from event listeners.
  const pause = useCallback(() => setRunning(false), []);
  useEffect(() => {
    if (!running) return;
    last.current = performance.now();
    const tick = () => {
      const current = performance.now();
      // Capture before React schedules the updater; the ref changes immediately below.
      const elapsed = Math.max(0, current - last.current) / 1000;
      if (!document.hidden) setSeconds((s) => s + elapsed);
      last.current = current;
    };
    const id = window.setInterval(tick, 200);
    const visibility = () => {
      if (document.hidden) {
        setRunning(false);
        setAutoPaused(true);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [running]);
  return {
    seconds,
    running,
    autoPaused,
    start: () => {
      setAutoPaused(false);
      setRunning(true);
    },
    pause,
    reset: () => {
      setRunning(false);
      setSeconds(0);
      setAutoPaused(false);
    },
  };
}
export type Timer = ReturnType<typeof useActiveTimer>;
export const timerText = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
// Phones: a modal bottom sheet (grabber, swipe down, Esc or tap outside to close, Save in the
// header so it never sits under the keyboard). Wider screens: the same form inline in the page.
export function Sheet({
  title,
  closeLabel,
  formId,
  submitLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  formId: string;
  submitLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ start: number; dy: number } | null>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (matchMedia("(max-width: 760px)").matches) {
      dialog.showModal();
      // Start VoiceOver at the sheet's title, not on Cancel, and keep the keyboard down.
      dialog.focus();
    } else dialog.show();
    // iOS Safari covers the page with the keyboard and pans it, so a bottom-pinned sheet ends
    // up mid-screen with its Save header scrolled away. While the keyboard is up, fill the
    // visible area instead; the fields scroll inside the sheet under its sticky header.
    const viewport = window.visualViewport;
    const fit = () => {
      if (!viewport || !dialog.matches(":modal")) return;
      const keyboardUp = window.innerHeight - viewport.height > 120;
      dialog.style.top = keyboardUp ? `${viewport.offsetTop + 8}px` : "";
      dialog.style.bottom = keyboardUp ? "auto" : "";
      dialog.style.height = keyboardUp ? `${viewport.height - 8}px` : "";
      dialog.style.maxHeight = keyboardUp ? `${viewport.height - 8}px` : "";
    };
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    return () => {
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
      dialog.close();
    };
  }, []);
  const move = (y: number) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, y - drag.current.start);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const release = () => {
    if (!drag.current || !ref.current) return;
    const dismiss = drag.current.dy > 110;
    drag.current = null;
    ref.current.style.transform = "";
    if (dismiss) onClose();
  };
  return (
    <dialog
      ref={ref}
      className="panel form-panel sheet"
      aria-labelledby={titleId}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Only the backdrop targets the dialog itself; the content sits in .sheet-body.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-body">
        <div
          className="sheet-handle"
          onPointerDown={(e) => {
            if (
              (e.target as HTMLElement).closest("button") ||
              !ref.current?.matches(":modal")
            )
              return;
            drag.current = { start: e.clientY, dy: 0 };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => move(e.clientY)}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <span className="sheet-grabber" aria-hidden="true" />
          <div className="sheet-header">
            <button type="button" className="sheet-cancel" onClick={onClose}>
              Cancel
            </button>
            <h2 id={titleId}>{title}</h2>
            <button type="submit" form={formId} className="sheet-save">
              {submitLabel}
            </button>
            <button
              type="button"
              className="icon-button sheet-close"
              aria-label={closeLabel}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function GoLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}

export function SleepChart({
  data,
  now,
  compact = false,
}: {
  data: WellnessData;
  now: Date;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = daysAgo(6 - i, now);
    const logs = data.sleep.filter((l) => sameDay(l.wakeTime, day));
    const minutes = logs.reduce((sum, l) => sum + durationMinutes(l), 0);
    const quality = logs.length
      ? logs.reduce((sum, l) => sum + l.quality, 0) / logs.length
      : 0;
    const label = day.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return { day, key: dayKey(day), logs, minutes, hours: minutes / 60, quality, label };
  });
  // Scale grows past 10h in 2h steps so long nights are never clipped.
  const max = Math.max(10, Math.ceil(Math.max(...days.map((d) => d.hours)) / 2) * 2);
  const detail = days.find((d) => d.key === selected);
  return (
    <>
      <div
        className={`sleep-chart ${compact ? "compact" : ""}`}
        role="group"
        aria-label="Sleep duration over the last seven days. Select a day for details."
      >
        <div className="chart-y" aria-hidden="true">
          <span>{max}h</span>
          <span>{max / 2}h</span>
          <span>0h</span>
        </div>
        <div className="chart-plot">
          <div className="chart-grid" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          {days.map((d) => (
            <button
              type="button"
              className={`chart-column ${d.key === dayKey(now) ? "today" : ""} ${d.key === selected ? "selected" : ""}`}
              key={d.key}
              aria-pressed={d.key === selected}
              aria-label={`${d.label}: ${d.logs.length ? `${minutesAsHours(Math.round(d.minutes))}, quality ${d.quality.toFixed(1)} of 5` : "not logged"}`}
              onClick={() => setSelected(d.key === selected ? null : d.key)}
            >
              <span className="bar-space">
                {d.logs.length ? (
                  <span
                    className="sleep-bar"
                    style={{ height: `${(d.hours / max) * 100}%` }}
                  >
                    <span>{d.hours.toFixed(1)}h</span>
                  </span>
                ) : (
                  <span className="not-logged">Not logged</span>
                )}
              </span>
              <span className="day-label">
                {d.day.toLocaleDateString([], { weekday: "short" })}
                <small>{d.day.getDate()}</small>
              </span>
              {!compact && (
                <span className="quality-label">
                  {d.quality ? `${d.quality.toFixed(1)} / 5` : "—"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <p className="chart-detail" aria-live="polite">
        {detail ? (
          <>
            <strong>{detail.label}</strong>
            {detail.logs.length
              ? detail.logs
                  .map(
                    (l) =>
                      ` · ${minutesAsHours(Math.round(durationMinutes(l)))}, ${clockTime(l.bedtime)} → ${clockTime(l.wakeTime)}, quality ${l.quality}/5`,
                  )
                  .join("")
              : " · Not logged"}
          </>
        ) : (
          "Tap a day to see its details."
        )}
      </p>
    </>
  );
}

export function ReminderRow({
  occurrence: o,
  data,
  setData,
  now,
  notify,
}: SharedProps & { occurrence: Occurrence }) {
  const taken = Boolean(o.takenAt);
  const skipped = Boolean(o.skippedAt);
  const snoozed =
    !taken && !skipped && o.snoozedUntil && new Date(o.snoozedUntil) > now;
  const due = isDue(o, now);
  const earlierDay = !sameDay(o.scheduledAt, now);
  const day = new Date(o.scheduledAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  const act = (action: "take" | "later" | "skip" | "undo") => {
    setData((current) => updateOccurrence(current, o.id, action));
    notify(
      action === "take"
        ? `${o.name} (${clockTime(o.scheduledAt)}${earlierDay ? `, ${day}` : ""}) marked as taken.`
        : action === "later"
          ? `${o.name} snoozed until ${clockTime(new Date(now.getTime() + 15 * 60000))}.`
          : action === "skip"
            ? `${o.name} for ${day} skipped. It no longer counts as due.`
            : `${o.name} is back to not taken.`,
      // Taken/skipped items from earlier days leave the list, so the toast carries the undo.
      action === "take" || action === "skip"
        ? () => setData((c) => updateOccurrence(c, o.id, "undo"))
        : undefined,
    );
  };
  void data;
  return (
    <div className={`reminder-row ${taken || skipped ? "is-taken" : ""}`}>
      <div className={`icon-tile ${taken || skipped ? "mint" : "peach"}`}>
        {taken ? <Check size={19} /> : <Pill size={19} />}
      </div>
      <div className="reminder-copy">
        <strong>{o.name}</strong>
        <span>
          {clockTime(o.scheduledAt)}
          {earlierDay ? ` · ${day}` : ""}
          {taken
            ? ` · Taken ${clockTime(o.takenAt!)}`
            : skipped
              ? " · Skipped"
              : snoozed
              ? ` · Later at ${clockTime(o.snoozedUntil!)}`
              : due
                ? " · Due now"
                : " · Upcoming"}
        </span>
        {o.note && <small>{o.note}</small>}
      </div>
      <div className="reminder-actions">
        {taken || skipped ? (
          <button
            className="text-button muted"
            onClick={() => act("undo")}
            aria-label={`Undo ${taken ? "taken" : "skipped"} ${o.name}`}
          >
            <Undo2 size={14} />
            Undo
          </button>
        ) : (
          <>
            <button
              className="taken-button"
              onClick={() => act("take")}
              aria-label={`Mark ${o.name} taken`}
            >
              <Check size={14} />
              Taken
            </button>
            {earlierDay ? (
              <button
                className="later-button"
                onClick={() => act("skip")}
                aria-label={`Skip ${o.name} for ${day}`}
              >
                <SkipForward size={13} />
                Skip
              </button>
            ) : (
              <button
                className="later-button"
                onClick={() => act("later")}
                aria-label={`Snooze ${o.name} for 15 minutes`}
              >
                <Clock3 size={13} />
                Later
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
