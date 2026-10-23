"use client";

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Flower2,
  Leaf,
  Moon,
  ScanLine,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  atTime,
  clockTime,
  dayKey,
  daysAgo,
  durationMinutes,
  isDue,
  minutesAsHours,
  sameDay,
  sleepSuggestion,
  type Page,
} from "@/lib/wellness";
import {
  Empty,
  GoLink,
  ReminderRow,
  SectionTitle,
  SleepChart,
  type Navigate,
  type SharedProps,
} from "./shared";

export function Overview(
  props: SharedProps & {
    navigate: Navigate;
    workSeconds: number;
    startBreathing: () => void;
  },
) {
  const { data, now, navigate, workSeconds, startBreathing } = props;
  const latest = [...data.sleep].sort((a, b) =>
    b.wakeTime.localeCompare(a.wakeTime),
  )[0];
  const activities = data.activities.filter((a) => sameDay(a.at, now));
  const exercise = activities
    .filter((a) => a.kind === "workout")
    .reduce((sum, a) => sum + a.minutes, 0);
  const mindful = data.breathing
    .filter((b) => sameDay(b.at, now))
    .reduce((sum, b) => sum + b.minutes, 0);
  const occurrences = data.occurrences.filter((o) =>
    sameDay(o.scheduledAt, now),
  );
  const taken = occurrences.filter((o) => o.takenAt).length;
  const due = data.occurrences.filter((o) => isDue(o, now));
  // Due items sit at the top of the page; this list holds the rest of today.
  const displayed = occurrences
    .filter((o) => !due.some((d) => d.id === o.id))
    .slice(0, 3);
  const recommendation = sleepSuggestion(
    data.sleep,
    data.settings.wakeTime,
    now,
  );
  const recent = data.sleep.filter(
    (l) => new Date(l.wakeTime) >= daysAgo(7, now),
  );
  const average = recent.length
    ? recent.reduce((sum, l) => sum + durationMinutes(l), 0) / recent.length
    : 0;
  const work = data.work
    .filter((w) => sameDay(w.at, now))
    .reduce((sum, w) => sum + w.seconds, workSeconds);
  const habits: { label: string; page: Page; done: boolean }[] = [
    {
      label: "Sleep",
      page: "sleep",
      done: Boolean(latest && sameDay(latest.wakeTime, now)),
    },
    { label: "Move", page: "movement", done: exercise > 0 },
    { label: "Breathe", page: "breathe", done: mindful > 0 },
    { label: "Reminders", page: "reminders", done: taken > 0 },
    {
      label: "Food",
      page: "nutrition",
      done: data.foodLog.some((f) => sameDay(f.at, now)),
    },
  ];
  const completedHabits = habits.filter((h) => h.done).length;
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  return (
    <>
      <div className="overview-heading">
        <div>
          <div className="date-eyebrow">
            <Sun size={14} />
            {now.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <h1>
            {greeting}
          </h1>
          <p>A fresh moment to check in with yourself.</p>
        </div>
      </div>
      <section className="panel quick-start">
        <SectionTitle title={due.length ? `Due now · ${due.length}` : "Due now"}>
          <GoLink onClick={() => navigate("reminders")}>All reminders</GoLink>
        </SectionTitle>
        {due.length ? (
          due
            .slice(0, 3)
            .map((o) => <ReminderRow key={o.id} {...props} occurrence={o} />)
        ) : (
          <p className="section-description">Nothing due right now.</p>
        )}
        <div className="quick-actions">
          <button
            className="primary-button"
            onClick={() => navigate("sleep", true)}
          >
            <Moon size={17} />
            Log sleep
          </button>
          <button className="secondary-button" onClick={startBreathing}>
            <Flower2 size={17} />
            Start breathing
          </button>
        </div>
      </section>
      <section className="panel vine-card">
        <div className="vine-heading">
          <h2>Today’s vine</h2>
          <span className="vine-count">
            <strong>{completedHabits}</strong> of 5
          </span>
        </div>
        <p className="vine-caption">
          {completedHabits === 5
            ? "Fully grown. Every habit checked in today."
            : "A leaf grows each time you check in with a habit."}
        </p>
        <div className="vine">
          <svg
            className="vine-stem"
            viewBox="0 0 300 60"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M2 34 C 40 8, 70 52, 120 30 S 200 6, 240 32 S 288 46, 298 22" />
          </svg>
          {habits.map((h, i) => (
            <button
              key={h.page}
              className={`vine-leaf ${h.done ? "grown" : ""}`}
              onClick={() => navigate(h.page)}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ rotate: `${i % 2 ? 28 : -28}deg` }}
              >
                <path
                  className="leaf-blade"
                  d="M12 2.5C6.6 6.2 4.7 11 6.2 16.4 7.3 20 9.6 21.5 12 21.5s4.7-1.5 5.8-5.1C19.3 11 17.4 6.2 12 2.5Z"
                />
                <path className="leaf-rib" d="M12 6.5v13" />
              </svg>
              <span>{h.label}</span>
              <span className="sr-only">{h.done ? ", done today" : ", not yet"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="hero-banner">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <Sparkles size={13} />A LITTLE CARE GOES A LONG WAY
          </span>
          <h2>
            Good habits.
            <br />
            <em>Better days.</em>
          </h2>
          <p>
            You don’t have to do it all. Just take
            <br className="desktop-break" /> one small step for yourself today.
          </p>
          <button onClick={() => navigate("breathe")} className="hero-button">
            Take a mindful moment
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <div className="art-sun" />
          <div className="leaf-shape leaf-one" />
          <div className="leaf-shape leaf-two" />
          <div className="leaf-shape leaf-three" />
          <div className="leaf-shape leaf-four" />
          <div className="plant-stem" />
        </div>
      </section>
      <div className="section-title snapshot-heading">
        <h2>Your daily snapshot</h2>
        <span className="subtle-label">Small steps, all in one place</span>
      </div>
      <div className="stat-grid">
        <button className="stat-card" onClick={() => navigate("sleep")}>
          <div className="stat-top">
            <span className="icon-tile lilac">
              <Moon size={18} />
            </span>
            <span>Sleep</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="stat-value">
            {latest ? minutesAsHours(durationMinutes(latest)) : "—"}
            <span>{latest ? "last logged" : "no records yet"}</span>
          </div>
          <div className="stat-bottom">
            <span className="tiny-dot lilac-dot" />
            {latest
              ? `Feeling ${latest.quality >= 4 ? "well rested" : "ready for a better night"}`
              : "A good day starts with rest"}
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate("movement")}>
          <div className="stat-top">
            <span className="icon-tile peach">
              <Activity size={18} />
            </span>
            <span>Movement</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="stat-value">
            {exercise}
            <span>active minutes</span>
          </div>
          <div className="stat-bottom">
            <span className="tiny-dot peach-dot" />
            {activities.filter((a) => a.kind === "break").length} stretch breaks
            today
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate("breathe")}>
          <div className="stat-top">
            <span className="icon-tile mint">
              <Flower2 size={18} />
            </span>
            <span>Mindfulness</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="stat-value">
            {mindful}
            <span>mindful minutes</span>
          </div>
          <div className="stat-bottom">
            <span className="tiny-dot mint-dot" />A little more room to breathe
          </div>
        </button>
        <button className="stat-card" onClick={() => navigate("reminders")}>
          <div className="stat-top">
            <span className="icon-tile yellow">
              <Check size={18} />
            </span>
            <span>Daily reminders</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="stat-value">
            {taken}
            <span className="stat-denominator">/ {occurrences.length}</span>
            <span>taken today</span>
          </div>
          <div className="stat-bottom">
            <span className="tiny-dot yellow-dot" />
            {due.length
              ? `${due.length} ready for your attention`
              : "One less thing to keep in mind"}
          </div>
        </button>
      </div>
      <div className="overview-middle">
        <section className="panel sleep-summary">
          <SectionTitle title="A rhythm for better rest">
            <GoLink onClick={() => navigate("sleep")}>View sleep</GoLink>
          </SectionTitle>
          <div className="sleep-summary-meta">
            <div>
              <strong>
                {average ? minutesAsHours(Math.round(average)) : "—"}
              </strong>
              <span>average sleep this week</span>
            </div>
            <span className="chart-legend">
              <i />
              Sleep duration
            </span>
          </div>
          <SleepChart data={data} now={now} compact />
          <div className="sleep-insight">
            <span className="icon-tile lilac">
              <Sparkles size={16} />
            </span>
            <p>
              Try winding down for a{" "}
              <strong>
                {clockTime(atTime(dayKey(now), recommendation.bedtime))}
              </strong>{" "}
              bedtime.
              <small>
                {recommendation.personalized
                  ? `Based on ${recommendation.count} nights you rated well.`
                  : "An eight-hour starting point for your routine."}
              </small>
            </p>
            <button
              aria-label="View bedtime suggestion"
              className="icon-button"
              onClick={() => navigate("sleep")}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
        <section className="breathe-teaser">
          <div className="breathe-teaser-top">
            <span className="eyebrow">PAUSE. BREATHE. RESET.</span>
            <Flower2 size={21} strokeWidth={1.3} />
          </div>
          <h2>
            A moment
            <br />
            just for you.
          </h2>
          <p>
            Let the day slow down.
            <br />
            One breath at a time.
          </p>
          <div className="mini-breath-orb" aria-hidden="true">
            <div>
              <div>
                <Flower2 size={30} strokeWidth={1.1} />
              </div>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => navigate("breathe")}
          >
            Let’s breathe
            <ArrowRight size={16} />
          </button>
          <span className="breathe-duration">
            <Clock3 size={12} />
            Just 1 minute to begin
          </span>
        </section>
      </div>
      <div className="overview-bottom">
        <section className="panel reminders-summary">
          <SectionTitle title="A little nudge">
            <GoLink onClick={() => navigate("reminders")}>All reminders</GoLink>
          </SectionTitle>
          <p className="section-description">
            Keep the little things consistent.
          </p>
          {displayed.length ? (
            displayed.map((o) => (
              <ReminderRow key={o.id} {...props} occurrence={o} />
            ))
          ) : occurrences.length ? (
            <p className="section-description">
              Everything else for today is in Due now above.
            </p>
          ) : (
            <Empty
              title="Make consistency easier"
              text="Add a daily vitamin or medication reminder to get started."
            />
          )}
        </section>
        <section className="panel nourish-summary">
          <span className="icon-tile mint">
            <ScanLine size={21} />
          </span>
          <h2>
            Know what
            <br />
            nourishes you.
          </h2>
          <p>
            A quick scan. A clearer picture
            <br />
            of what’s in your food.
          </p>
          <button className="text-button" onClick={() => navigate("nutrition")}>
            Scan a product
            <ArrowRight size={16} />
          </button>
          <div className="barcode-art" aria-hidden="true" />
        </section>
      </div>
      <div className="daily-note">
        <span className="note-icon">
          <Leaf size={19} />
        </span>
        <p>
          <strong>Every little step counts.</strong> You’ve checked in with{" "}
          {completedHabits} of your 5 wellbeing habits.
          {work > 0
            ? ` And made space for ${Math.floor(work / 60)} minutes of focused work.`
            : " There’s no perfect day. Just your next small step."}
        </p>
        <span
          className="habit-dots"
          role="img"
          aria-label={`${completedHabits} of 5 habits`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={i < completedHabits ? "filled" : ""} />
          ))}
        </span>
      </div>
    </>
  );
}
