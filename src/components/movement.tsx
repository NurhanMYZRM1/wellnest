"use client";

import { useState, type FormEvent } from "react";
import {
  Activity,
  Armchair,
  Check,
  Clock3,
  Footprints,
  Pause,
  Play,
  Plus,
  Square,
} from "lucide-react";
import { clockTime, sameDay, uid } from "@/lib/wellness";
import {
  Empty,
  PageHeading,
  SectionTitle,
  timerText,
  type SharedProps,
  type Timer,
} from "./shared";

export function MovementPage({
  data,
  setData,
  now,
  notify,
  timer,
  lastBreak,
  setLastBreak,
}: SharedProps & {
  timer: Timer;
  lastBreak: number;
  setLastBreak: (seconds: number) => void;
}) {
  const [workout, setWorkout] = useState("Walking");
  const [minutes, setMinutes] = useState("20");
  const today = data.activities.filter((a) => sameDay(a.at, now));
  const due = timer.seconds - lastBreak >= data.settings.breakMinutes * 60;
  const addActivity = (
    kind: "posture" | "break" | "workout",
    name: string,
    duration: number,
  ) => {
    setData((d) => ({
      ...d,
      activities: [
        ...d.activities,
        {
          id: uid(),
          at: new Date().toISOString(),
          kind,
          name,
          minutes: duration,
        },
      ],
    }));
    if (kind === "break") {
      setLastBreak(timer.seconds);
      notify("Stretch break logged. Your body says thank you.");
    } else if (kind === "posture") notify("Posture check-in logged.");
    else notify(`${duration} minutes of ${name.toLowerCase()} logged.`);
  };
  const finishWork = () => {
    if (timer.seconds >= 1)
      setData((d) => ({
        ...d,
        work: [
          ...d.work,
          {
            id: uid(),
            at: new Date().toISOString(),
            seconds: Math.floor(timer.seconds),
          },
        ],
      }));
    timer.reset();
    setLastBreak(0);
    notify("Work session saved. Make a little room to move.");
  };
  const logWorkout = (e: FormEvent) => {
    e.preventDefault();
    const duration = Number(minutes);
    if (duration > 0 && duration <= 1440 && Number.isInteger(duration))
      addActivity("workout", workout, duration);
  };
  return (
    <>
      <PageHeading
        title="Move a little. Feel better."
        description="Make space for movement in the middle of your day."
      />
      <div className="three-metrics">
        <div>
          <span className="icon-tile peach">
            <Footprints size={20} />
          </span>
          <strong>
            {today
              .filter((a) => a.kind === "workout")
              .reduce((sum, a) => sum + a.minutes, 0)}
            <small>active minutes</small>
          </strong>
        </div>
        <div>
          <span className="icon-tile mint">
            <Activity size={20} />
          </span>
          <strong>
            {today.filter((a) => a.kind === "break").length}
            <small>stretch breaks</small>
          </strong>
        </div>
        <div>
          <span className="icon-tile lilac">
            <Armchair size={20} />
          </span>
          <strong>
            {today.filter((a) => a.kind === "posture").length}
            <small>posture check-ins</small>
          </strong>
        </div>
      </div>
      <div className="two-col">
        <section className="panel work-timer-panel">
          <SectionTitle title="Focus, with a little balance">
            <Clock3 size={20} />
          </SectionTitle>
          <span className="timer-status">
            <span className={timer.running ? "pulsing" : ""} />
            {timer.running
              ? "Your work session is running"
              : timer.seconds > 0
                ? "Your work session is paused"
                : "Ready when you are"}
          </span>
          <div
            className="work-clock"
            role="timer"
            aria-label={`${Math.floor(timer.seconds / 60)} minutes and ${Math.floor(timer.seconds % 60)} seconds`}
          >
            {timerText(timer.seconds)}
          </div>
          <p className="timer-label">IN-APP WORK TIME</p>
          <div className="timer-controls">
            <button
              className="primary-button"
              onClick={timer.running ? timer.pause : timer.start}
            >
              {timer.running ? <Pause size={17} /> : <Play size={17} />}
              {timer.running
                ? "Pause"
                : timer.seconds > 0
                  ? "Resume"
                  : "Start work session"}
            </button>
            {timer.seconds > 0 && (
              <button className="secondary-button" onClick={finishWork}>
                <Square size={15} />
                End session
              </button>
            )}
          </div>
          <label className="inline-setting">
            Remind me to move every
            <select
              value={data.settings.breakMinutes}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    breakMinutes: Number(e.target.value),
                  },
                }))
              }
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>
          {timer.autoPaused && (
            <p className="inline-note">
              Paused while you were away. Resume when you’re ready.
            </p>
          )}
          <p className="fine-print">
            Counts only while this app is visible and running. This is not your
            device’s total screen time.
          </p>
        </section>
        <section className={`stretch-panel ${due ? "break-ready" : ""}`}>
          <span className="eyebrow">
            {due ? "YOUR BREAK IS READY" : "A SMALL RESET FOR YOUR BODY"}
          </span>
          <div className="stretch-illustration" aria-hidden="true">
            <svg viewBox="0 0 200 140" fill="none">
              <circle cx="100" cy="67" r="62" fill="#efdfc6" />
              <circle cx="101" cy="29" r="13" fill="#a46740" />
              <path d="M91 47c0-5 21-5 21 0l8 44H80l11-44Z" fill="#54745d" />
              <path
                d="m90 51-28 7-24-24m73 17 26 7 24-24"
                stroke="#a46740"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M88 92 78 123m34-31 10 31"
                stroke="#354e43"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <path
                d="m59 22 8-6m69 0 7 6"
                stroke="#a78e65"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2>Unfold your day.</h2>
          <p>
            Stand up, relax your shoulders, and take a gentle two-minute stretch
            at your own pace.
          </p>
          <button
            className="secondary-button"
            onClick={() => addActivity("break", "Stretch break", 2)}
          >
            <Check size={17} />I took a stretch break
          </button>
          <div className="posture-check">
            <Armchair size={20} />
            <p>
              Feet supported. Shoulders relaxed.
              <br />
              Screen at a comfortable height.
            </p>
            <button
              className="icon-button"
              aria-label="Log posture check-in"
              onClick={() => addActivity("posture", "Posture check-in", 0)}
            >
              <Check size={18} />
            </button>
          </div>
        </section>
      </div>
      <div className="two-col">
        <section className="panel">
          <SectionTitle title="Made time to move?" />
          <p className="section-description">
            A walk, a workout, or whatever feels good.
          </p>
          <form onSubmit={logWorkout}>
            <div className="form-grid">
              <label>
                Activity
                <select
                  value={workout}
                  onChange={(e) => setWorkout(e.target.value)}
                >
                  {[
                    "Walking",
                    "Running",
                    "Cycling",
                    "Yoga",
                    "Strength training",
                    "Swimming",
                    "Dancing",
                    "Other workout",
                  ].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Minutes
                <input
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  required
                />
              </label>
            </div>
            <button className="primary-button">
              <Plus size={16} />
              Log activity
            </button>
          </form>
          <p className="fine-print">
            Movement and posture records are self-reported.
          </p>
        </section>
        <section className="panel">
          <SectionTitle title="Today’s little wins" />
          {today.length ? (
            <div className="activity-list">
              {[...today].reverse().map((a) => (
                <div className="activity-row" key={a.id}>
                  <span
                    className={`icon-tile ${a.kind === "workout" ? "peach" : "mint"}`}
                  >
                    {a.kind === "workout" ? (
                      <Footprints size={17} />
                    ) : (
                      <Check size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <span>
                      {clockTime(a.at)}
                      {a.minutes > 0 ? ` · ${a.minutes} min` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Every move matters"
              text="Your check-ins and activities will appear here."
            />
          )}
          <div className="list-footer">
            {Math.floor(
              data.work
                .filter((w) => sameDay(w.at, now))
                .reduce((sum, w) => sum + w.seconds, 0) / 60,
            )}{" "}
            minutes of completed in-app work today
          </div>
        </section>
      </div>
    </>
  );
}
