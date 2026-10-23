"use client";

import { useState, type FormEvent } from "react";
import { Bell, Check, Clock3, Pause, Pencil, Play, Plus, X } from "lucide-react";
import {
  atTime,
  clockTime,
  dayKey,
  daysAgo,
  isDue,
  reconcileOccurrences,
  sameDay,
  uid,
  type Reminder,
} from "@/lib/wellness";
import {
  Empty,
  PageHeading,
  ReminderRow,
  SectionTitle,
  Sheet,
  type SharedProps,
} from "./shared";

export function RemindersPage(props: SharedProps) {
  const { data, setData, now, notify } = props;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [times, setTimes] = useState(["08:00"]);
  const [error, setError] = useState("");
  const today = data.occurrences.filter((o) => sameDay(o.scheduledAt, now));
  const overdue = data.occurrences.filter(
    (o) => !sameDay(o.scheduledAt, now) && isDue(o, now),
  );
  const carried = data.occurrences.filter(
    (o) =>
      !sameDay(o.scheduledAt, now) &&
      !o.takenAt &&
      o.snoozedUntil &&
      new Date(o.snoozedUntil) > now,
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give this reminder a name.");
      return;
    }
    if (times.some((t) => !t) || new Set(times).size !== times.length) {
      setError("Choose a different time for each daily reminder.");
      return;
    }
    const sorted = [...times].sort();
    const summary = sorted
      .map((t) => clockTime(atTime(dayKey(now), t)))
      .join(" · ");
    if (editing) {
      const id = editing.id;
      const time = new Date();
      // Edits apply from now: drop pending future occurrences and regenerate them without backfilling past days.
      setData((d) =>
        reconcileOccurrences({
          ...d,
          reminders: d.reminders.map((r) =>
            r.id === id
              ? {
                  ...r,
                  name: name.trim(),
                  note: note.trim(),
                  times: sorted,
                  createdAt: time.toISOString(),
                }
              : r,
          ),
          occurrences: d.occurrences.filter(
            (o) =>
              o.reminderId !== id ||
              o.takenAt ||
              o.skippedAt ||
              new Date(o.scheduledAt) <= time,
          ),
        }),
      );
      closeForm();
      notify(`Updated ${name.trim()}: ${summary}, starting now.`);
      return;
    }
    // Include selected times today, even if they already passed, so a new routine can start now.
    const reminder = {
      id: uid(),
      name: name.trim(),
      note: note.trim(),
      times: sorted,
      enabled: true,
      createdAt: atTime(dayKey(new Date()), "00:00").toISOString(),
    };
    setData((d) =>
      reconcileOccurrences({ ...d, reminders: [...d.reminders, reminder] }),
    );
    closeForm();
    notify(`Added ${reminder.name} daily at ${summary}.`);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setName("");
    setNote("");
    setTimes(["08:00"]);
    setError("");
  };
  const openEdit = (reminder: Reminder) => {
    setEditing(reminder);
    setName(reminder.name);
    setNote(reminder.note);
    setTimes(reminder.times);
    setError("");
    setFormOpen(true);
  };
  // Resuming restarts the schedule from now, so paused days are not backfilled as missed.
  const resume = (reminder: Reminder) => {
    setData((d) =>
      reconcileOccurrences({
        ...d,
        reminders: d.reminders.map((r) =>
          r.id === reminder.id
            ? { ...r, enabled: true, createdAt: new Date().toISOString() }
            : r,
        ),
      }),
    );
    notify(`Resumed ${reminder.name}. Reminders start again from now.`);
  };
  const pause = (reminder: Reminder) => {
    const time = new Date();
    setData((d) => ({
      ...d,
      reminders: d.reminders.map((r) =>
        r.id === reminder.id ? { ...r, enabled: false } : r,
      ),
      occurrences: d.occurrences.filter(
        (o) =>
          o.reminderId !== reminder.id ||
          o.takenAt ||
          new Date(o.scheduledAt) <= time,
      ),
    }));
    notify(
      `Paused ${reminder.name}. No new reminders until you resume it; past records are kept.`,
      () => resume(reminder),
    );
  };
  return (
    <>
      <PageHeading
        eyebrow="CONSISTENCY, MADE SIMPLE"
        title="One less thing to remember."
        description="A gentle nudge for the little things that matter."
      >
        <button
          className="primary-button"
          onClick={() => (formOpen ? closeForm() : setFormOpen(true))}
        >
          <Plus size={17} />
          Add reminder
        </button>
      </PageHeading>
      <div className="reminder-intro">
        <span className="icon-tile yellow">
          <Bell size={24} />
        </span>
        <div>
          <h2>
            {today.filter((o) => o.takenAt).length} of {today.length} taken
            today
          </h2>
          <p>Your daily rhythm, one tap at a time.</p>
        </div>
        <div className="completion-track">
          <i
            style={{
              width: `${today.length ? (today.filter((o) => o.takenAt).length / today.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="inline-badge">
          <span />
          In-app reminders
        </span>
      </div>
      {formOpen && (
        <Sheet
          title={editing ? `Edit ${editing.name}` : "Create a daily reminder"}
          closeLabel="Close reminder form"
          formId="reminder-form"
          submitLabel="Save"
          onClose={closeForm}
        >
          <form id="reminder-form" onSubmit={submit}>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-grid">
              <label>
                Name
                <input
                  autoFocus
                  required
                  maxLength={80}
                  placeholder="e.g. Daily vitamin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                <span>
                  Dose or note <span className="optional">(optional)</span>
                </span>
                <input
                  maxLength={160}
                  placeholder="Add your own label instructions"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
            <fieldset className="time-fields">
              <legend>Remind me daily at</legend>
              <div>
                {times.map((time, i) => (
                  <div key={i}>
                    <input
                      aria-label={`Reminder time ${i + 1}`}
                      type="time"
                      required
                      value={time}
                      onChange={(e) =>
                        setTimes((ts) =>
                          ts.map((t, index) =>
                            i === index ? e.target.value : t,
                          ),
                        )
                      }
                    />
                    {times.length > 1 && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove time ${i + 1}`}
                        onClick={() =>
                          setTimes((ts) => ts.filter((_, index) => i !== index))
                        }
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
                {times.length < 8 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setTimes((ts) => [...ts, "20:00"])}
                  >
                    <Plus size={15} />
                    Add time
                  </button>
                )}
              </div>
            </fieldset>
            <p className="fine-print">
              {editing
                ? "Changes apply from now on. Past records stay as they are. "
                : "Times that have already passed today will appear as due. "}
              Dose
              notes are entered by you; Wellnest does not recommend doses.
            </p>
            <button type="submit" className="primary-button">
              <Check size={16} />
              Save reminder
            </button>
          </form>
        </Sheet>
      )}
      <div className="two-col reminders-grid">
        <section className="panel">
          <SectionTitle title="Today’s reminders">
            <span className="subtle-label">
              {now.toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </SectionTitle>
          {today.length ? (
            [...today]
              .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
              .map((o) => <ReminderRow key={o.id} {...props} occurrence={o} />)
          ) : (
            <Empty
              title="A gentle nudge, right on time"
              text="Add a vitamin or medication to start your daily routine."
            />
          )}
          <div className="reminder-explainer">
            <Clock3 size={16} />
            <p>
              <strong>Later means 15 minutes.</strong> Your daily schedule stays
              the same. Reminders appear while the app is open, and overdue
              items return when you reopen it.
            </p>
          </div>
        </section>
        <div className="stack">
          {(overdue.length > 0 || carried.length > 0) && (
            <section className="panel">
              <SectionTitle title="Missed on earlier days">
                <span className="subtle-label">
                  {overdue.length + carried.length} open
                </span>
              </SectionTitle>
              <p className="section-description">
                Mark each one taken or skip it to clear it from Due now.
              </p>
              {[...overdue, ...carried]
                .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
                .map((o) => (
                  <ReminderRow key={o.id} {...props} occurrence={o} />
                ))}
            </section>
          )}
          <section className="panel">
            <SectionTitle title="Your week of consistency" />
            <div className="week-history">
              {Array.from({ length: 7 }, (_, i) => daysAgo(6 - i, now)).map(
                (day) => {
                  const entries = data.occurrences.filter((o) =>
                    sameDay(o.scheduledAt, day),
                  );
                  const taken = entries.filter((o) => o.takenAt).length;
                  return (
                    <div key={dayKey(day)}>
                      <span>
                        {day.toLocaleDateString([], { weekday: "short" })}
                      </span>
                      <span
                        className={`history-circle ${entries.length && taken === entries.length ? "complete" : taken ? "partial" : ""}`}
                      >
                        {entries.length && taken === entries.length ? (
                          <Check size={16} />
                        ) : (
                          taken || "—"
                        )}
                      </span>
                      <small>
                        {taken}/{entries.length}
                      </small>
                    </div>
                  );
                },
              )}
            </div>
            <p className="fine-print">
              Taken / scheduled. Uncompleted reminders stay in your history.
            </p>
          </section>
          <section className="panel">
            <SectionTitle title="Your daily routine" />
            {data.reminders.length ? (
              data.reminders.map((r) => (
                <div key={r.id} className="routine-row">
                  <div>
                    <strong>{r.name}</strong>
                    <span>
                      {r.enabled ? "" : "Paused · "}
                      {r.times
                        .map((t) => clockTime(atTime(dayKey(now), t)))
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="routine-actions">
                    <button
                      className="text-button muted"
                      onClick={() => openEdit(r)}
                      aria-label={`Edit ${r.name} reminder`}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    {r.enabled ? (
                      <button
                        className="text-button muted"
                        onClick={() => pause(r)}
                        aria-label={`Pause ${r.name} reminder`}
                      >
                        <Pause size={14} />
                        Pause
                      </button>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => resume(r)}
                        aria-label={`Resume ${r.name} reminder`}
                      >
                        <Play size={14} />
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="section-description">
                Your active reminders will live here.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
