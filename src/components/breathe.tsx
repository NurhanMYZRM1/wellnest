"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Flower2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Wind,
} from "lucide-react";
import { sameDay, uid } from "@/lib/wellness";
import {
  PageHeading,
  timerText,
  useActiveTimer,
  type SharedProps,
} from "./shared";

// Lives in WellnessApp so an unfinished session survives leaving the Breathe page.
export function useBreathSession() {
  const timer = useActiveTimer();
  const [duration, setDuration] = useState(1);
  const [completed, setCompleted] = useState(false);
  return { timer, duration, setDuration, completed, setCompleted };
}
export type Breath = ReturnType<typeof useBreathSession>;

export function BreathePage({
  data,
  setData,
  now,
  notify,
  session,
}: SharedProps & { session: Breath }) {
  const { timer, duration, setDuration, completed, setCompleted } = session;
  const recorded = useRef(completed);
  const done = timer.seconds >= duration * 60;
  const breathingIn = timer.seconds % 10 < 4;
  const phaseRemaining = Math.ceil(
    breathingIn ? 4 - (timer.seconds % 10) : 10 - (timer.seconds % 10),
  );
  const minutesToday = data.breathing
    .filter((b) => sameDay(b.at, now))
    .reduce((sum, b) => sum + b.minutes, 0);
  const completeRef = useRef(() => {});
  useEffect(() => {
    completeRef.current = () => {
      timer.pause();
      setCompleted(true);
      setData((d) => ({
        ...d,
        breathing: [
          ...d.breathing,
          { id: uid(), at: new Date().toISOString(), minutes: duration },
        ],
      }));
      notify("A moment well spent. Breathing session completed.");
    };
  });
  useEffect(() => {
    if (done && !recorded.current) {
      recorded.current = true;
      completeRef.current();
    }
  }, [done]);
  const reset = () => {
    timer.reset();
    setCompleted(false);
    recorded.current = false;
  };
  return (
    <>
      <PageHeading
        eyebrow="COME BACK TO YOURSELF"
        title="Nothing to do. Just breathe."
        description="Let your shoulders soften. Let this moment be yours."
      />
      <section className="breathing-studio">
        <div className="studio-top">
          <span>
            <Wind size={17} />A gentle guided breath
          </span>
          <span>{minutesToday} mindful minutes today</span>
        </div>
        <div
          className="duration-selector"
          role="group"
          aria-label="Session duration"
        >
          {[1, 3, 5].map((min) => (
            <button
              key={min}
              disabled={timer.seconds > 0 || timer.running}
              className={duration === min ? "selected" : ""}
              onClick={() => setDuration(min)}
            >
              {min} min
            </button>
          ))}
        </div>
        <div
          className={`breathing-orb-container ${timer.running && !done ? "is-running" : ""}`}
        >
          <div
            className={`breathing-orb ${breathingIn ? "inhale" : "exhale"}`}
            style={{
              transform:
                timer.running && !done
                  ? `scale(${breathingIn ? 0.8 + ((timer.seconds % 10) / 4) * 0.2 : 1 - (((timer.seconds % 10) - 4) / 6) * 0.2})`
                  : "scale(0.9)",
            }}
          >
            <div className="orb-inner" />
          </div>
          <div className="orb-text">
            {completed ? (
              <Check size={34} strokeWidth={1.3} />
            ) : (
              <Flower2 size={29} strokeWidth={1.2} />
            )}
            <h2>
              {completed
                ? "Beautifully done."
                : !timer.running
                  ? timer.seconds > 0
                    ? "Take your time."
                    : "Find your calm."
                  : breathingIn
                    ? "Breathe in"
                    : "Breathe out"}
            </h2>
            <span>
              {completed
                ? "A little care, just for you."
                : timer.running
                  ? `${phaseRemaining} seconds`
                  : timer.seconds > 0
                    ? "Resume when you’re ready"
                    : "Let the circle guide you"}
            </span>
          </div>
        </div>
        <div
          className="breathing-clock"
          role="timer"
          aria-label="Time remaining"
        >
          {timerText(Math.max(0, duration * 60 - timer.seconds))}
        </div>
        <span className="breathing-rhythm">
          4 seconds in <span>·</span> 6 seconds out <span>·</span> No holds
        </span>
        <div className="timer-controls">
          {completed ? (
            <button className="primary-button" onClick={reset}>
              <RotateCcw size={16} />
              Another mindful moment
            </button>
          ) : (
            <>
              <button
                className="primary-button"
                onClick={timer.running ? timer.pause : timer.start}
              >
                {timer.running ? <Pause size={17} /> : <Play size={17} />}
                {timer.running
                  ? "Pause session"
                  : timer.seconds > 0
                    ? "Resume session"
                    : "Begin session"}
              </button>
              {timer.seconds > 0 && (
                <button className="secondary-button" onClick={reset}>
                  <Square size={15} />
                  Stop
                </button>
              )}
            </>
          )}
        </div>
        {timer.autoPaused && !completed && (
          <p className="inline-note">
            Your session paused when you left the app.
          </p>
        )}
        <p className="studio-note">
          Breathe comfortably. You can pause or stop whenever you need.
        </p>
        <div className="studio-bottom">
          <span>
            <span className="tiny-dot mint-dot" />
            Your quiet corner of the day
          </span>
          <span>Completed sessions are saved automatically</span>
        </div>
      </section>
      <div className="breathing-tips">
        <div>
          <span>01</span>
          <h3>Settle in</h3>
          <p>Find a comfortable seat and soften your gaze.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Follow your breath</h3>
          <p>Gently breathe in as the circle grows, and out as it settles.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Carry the calm</h3>
          <p>Take this little moment of stillness into the rest of your day.</p>
        </div>
      </div>
    </>
  );
}
