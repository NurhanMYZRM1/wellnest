"use client";

import { useState, type FormEvent } from "react";
import {
  Check,
  Moon,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import {
  atTime,
  clockTime,
  dayKey,
  daysAgo,
  durationMinutes,
  localInput,
  minutesAsHours,
  overlappingSleep,
  sleepSuggestion,
  uid,
  validSleep,
  type SleepLog,
} from "@/lib/wellness";
import {
  Empty,
  PageHeading,
  SectionTitle,
  Sheet,
  SleepChart,
  type SharedProps,
} from "./shared";

const nightLabel = (log: SleepLog) =>
  `${new Date(log.wakeTime).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} (${clockTime(log.bedtime)} → ${clockTime(log.wakeTime)})`;

export function SleepPage({
  data,
  setData,
  now,
  notify,
  logNow = false,
}: SharedProps & { logNow?: boolean }) {
  const defaultWake = () => {
    const wakeDate = atTime(dayKey(now), data.settings.wakeTime);
    if (wakeDate > now) wakeDate.setDate(wakeDate.getDate() - 1);
    return wakeDate;
  };
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(logNow);
  const [bedtime, setBedtime] = useState(() =>
    localInput(new Date(defaultWake().getTime() - 8 * 3600000)),
  );
  const [wake, setWake] = useState(() => localInput(defaultWake()));
  const [quality, setQuality] = useState(4);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<SleepLog | null>(null);
  const recommendation = sleepSuggestion(
    data.sleep,
    data.settings.wakeTime,
    now,
  );
  const openForm = (log?: SleepLog) => {
    const wakeDate = defaultWake();
    setEditing(log?.id || null);
    setConflict(null);
    setBedtime(
      localInput(
        log
          ? new Date(log.bedtime)
          : new Date(wakeDate.getTime() - 8 * 3600000),
      ),
    );
    setWake(localInput(log ? new Date(log.wakeTime) : wakeDate));
    setQuality(log?.quality || 4);
    setError("");
    setFormOpen(true);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setConflict(null);
    const log = { id: editing || uid(), bedtime, wakeTime: wake, quality };
    const error = validSleep(log);
    if (error) {
      setError(error);
      return;
    }
    const overlap = overlappingSleep(data.sleep, log);
    if (overlap) {
      setError(`This overlaps the night you already logged for ${nightLabel(overlap)}.`);
      setConflict(overlap);
      return;
    }
    const serialized = {
      ...log,
      bedtime: new Date(bedtime).toISOString(),
      wakeTime: new Date(wake).toISOString(),
    };
    setData((d) => ({
      ...d,
      sleep: [...d.sleep.filter((l) => l.id !== serialized.id), serialized],
    }));
    setFormOpen(false);
    notify(
      editing
        ? "Sleep record updated."
        : "A little more insight into your rest. Sleep logged.",
    );
  };
  const recent = data.sleep.filter(
    (l) => new Date(l.wakeTime) >= daysAgo(7, now),
  );
  const average = recent.length
    ? recent.reduce((sum, l) => sum + durationMinutes(l), 0) / recent.length
    : 0;
  return (
    <>
      <PageHeading
        eyebrow="REST WELL, LIVE WELL"
        title="Find your sleep rhythm."
        description="A little reflection tonight. A more rested tomorrow."
      >
        <button className="primary-button" onClick={() => openForm()}>
          <Plus size={17} />
          Log sleep
        </button>
      </PageHeading>
      {formOpen && (
        <Sheet
          title={editing ? "Edit your night" : "How was your night?"}
          closeLabel="Close sleep form"
          formId="sleep-form"
          submitLabel="Save"
          onClose={() => setFormOpen(false)}
        >
          <form id="sleep-form" onSubmit={submit}>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {conflict && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => openForm(conflict)}
              >
                <Pencil size={16} />
                Edit that night instead
              </button>
            )}
            <div className="form-grid">
              <label>
                Bedtime
                <input
                  type="datetime-local"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  required
                />
              </label>
              <label>
                Wake-up
                <input
                  type="datetime-local"
                  value={wake}
                  onChange={(e) => setWake(e.target.value)}
                  required
                />
              </label>
            </div>
            <fieldset className="quality-picker">
              <legend>How rested did you feel?</legend>
              <div>
                {["Very tired", "Tired", "Okay", "Rested", "Great"].map(
                  (label, i) => (
                    <button
                      key={label}
                      type="button"
                      className={quality === i + 1 ? "selected" : ""}
                      aria-pressed={quality === i + 1}
                      onClick={() => setQuality(i + 1)}
                    >
                      <span>{i + 1}</span>
                      {label}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <button className="primary-button" type="submit">
              <Check size={16} />
              Save sleep
            </button>
          </form>
        </Sheet>
      )}
      <div className="two-col">
        <section className="panel">
          <SectionTitle title="Your last seven days">
            <span className="icon-tile lilac">
              <Moon size={19} />
            </span>
          </SectionTitle>
          <div className="big-metric">
            {average ? minutesAsHours(Math.round(average)) : "—"}
            <span>average nightly sleep</span>
          </div>
          <SleepChart data={data} now={now} />
          <p className="chart-caption">
            Bars show sleep duration. Ratings below each day show sleep quality
            out of 5.
          </p>
        </section>
        <section className="suggestion-panel">
          <span className="eyebrow">
            <Sparkles size={14} />
            YOUR EVENING, REIMAGINED
          </span>
          <h2>
            A bedtime to
            <br />
            try tonight.
          </h2>
          <div className="suggested-time">
            {clockTime(atTime(dayKey(now), recommendation.bedtime))}
          </div>
          <div className="suggestion-schedule">
            <span>
              <Moon size={16} />
              {minutesAsHours(recommendation.minutes)} of rest
            </span>
            <span>
              <Sun size={16} />
              Wake at {clockTime(atTime(dayKey(now), data.settings.wakeTime))}
            </span>
          </div>
          <label className="wake-setting">
            My target wake-up time
            <input
              aria-label="My target wake-up time"
              type="time"
              value={data.settings.wakeTime}
              required
              onChange={(e) => {
                if (e.target.value)
                  setData((d) => ({
                    ...d,
                    settings: { ...d.settings, wakeTime: e.target.value },
                  }));
              }}
            />
          </label>
          <p>
            {recommendation.personalized
              ? `Based on the median duration of ${recommendation.count} nights you rated 4–5 in the last 14 days, rounded to 15 minutes and kept within 7–9 hours.`
              : `Start with eight hours. Log at least three nights rated 4–5 in a 14-day period to personalize your suggestion (${recommendation.count}/3 so far).`}
          </p>
          <small>
            An experimental habit suggestion, not a medically established
            optimum.{" "}
            <a
              href="https://www.cdc.gov/sleep/about/index.html"
              target="_blank"
              rel="noreferrer"
            >
              Read adult sleep guidance ↗
            </a>
          </small>
        </section>
      </div>
      <section className="panel">
        <SectionTitle title="Your sleep journal">
          <span className="subtle-label">
            {data.sleep.length} nights logged
          </span>
        </SectionTitle>
        {data.sleep.length ? (
          <div className="journal-list">
            {[...data.sleep]
              .sort((a, b) => b.wakeTime.localeCompare(a.wakeTime))
              .map((log) => (
                <div className="journal-row" key={log.id}>
                  <span className="icon-tile lilac">
                    <Moon size={18} />
                  </span>
                  <div className="journal-copy">
                    <strong>
                      {new Date(log.wakeTime).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </strong>
                    <span>
                      {clockTime(log.bedtime)} → {clockTime(log.wakeTime)}
                    </span>
                  </div>
                  <strong className="journal-duration">
                    {minutesAsHours(durationMinutes(log))}
                  </strong>
                  <span className="quality-chip">
                    {log.quality}/5 <span>quality</span>
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => openForm(log)}
                    aria-label={`Edit sleep ${dayKey(log.wakeTime)}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button delete-button"
                    aria-label={`Delete sleep ${dayKey(log.wakeTime)}`}
                    onClick={() => {
                      setData((d) => ({
                        ...d,
                        sleep: d.sleep.filter((l) => l.id !== log.id),
                      }));
                      notify(
                        `Deleted sleep for ${nightLabel(log)}.`,
                        () =>
                          setData((d) => ({
                            ...d,
                            sleep: [...d.sleep.filter((l) => l.id !== log.id), log],
                          })),
                      );
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <Empty
            title="Your next good night starts here"
            text="Log your sleep to discover patterns and build a routine that feels right."
          />
        )}
      </section>
    </>
  );
}
