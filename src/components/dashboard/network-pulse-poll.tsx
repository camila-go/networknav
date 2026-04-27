"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NETWORK_PULSE_POLLS,
  type NetworkPulsePollDefinition,
} from "@/lib/network-pulse/constants";
import type { NetworkPulsePollPayload } from "@/lib/network-pulse/types";

function getSlideStride(scrollEl: HTMLDivElement): number {
  const slide = scrollEl.querySelector<HTMLElement>("[data-pulse-slide]");
  if (!slide) return Math.max(scrollEl.clientWidth + 16, 1);
  const gap =
    parseInt(getComputedStyle(scrollEl).gap || "16", 10) || 16;
  const w = slide.getBoundingClientRect().width;
  return Math.max(w + gap, 1);
}

export function NetworkPulseSection() {
  const [pollsState, setPollsState] = useState<
    Record<string, NetworkPulsePollPayload> | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submittingPollId, setSubmittingPollId] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [pulseOpen, setPulseOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/network-pulse", { cache: "no-store" });
      const json = await res.json();
      if (!json.success || !json.data?.polls) {
        setLoadError(json.error ?? "Could not load polls");
        return;
      }
      setPollsState(json.data.polls as Record<string, NetworkPulsePollPayload>);
    } catch {
      setLoadError("Could not load polls");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const stride = getSlideStride(el);
    if (stride < 8) return;
    const idx = Math.round(el.scrollLeft / stride);
    if (!Number.isFinite(idx)) return;
    setActiveSlide(
      Math.min(Math.max(0, idx), NETWORK_PULSE_POLLS.length - 1)
    );
  }, []);

  const submitVote = async (
    poll: NetworkPulsePollDefinition,
    optionId: string
  ) => {
    setVoteError(null);
    setSubmittingPollId(poll.pollId);
    try {
      const res = await fetch("/api/network-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.pollId, optionId }),
      });
      const json = await res.json();
      if (!json.success) {
        setVoteError(
          json.error ??
            (res.status === 401 ? "Sign in to vote" : "Vote failed")
        );
        return;
      }
      setPollsState(json.data.polls as Record<string, NetworkPulsePollPayload>);
    } catch {
      setVoteError("Vote failed");
    } finally {
      setSubmittingPollId(null);
    }
  };

  if (!hydrated) {
    return (
      <section className="w-full rounded-[32px] border border-[#62d0ea]/20 bg-[#0d0d0d] p-6 md:p-8">
        <div className="h-28 w-full shimmer rounded-xl" aria-hidden />
      </section>
    );
  }

  if (loadError || !pollsState) {
    return (
      <section
        className="w-full rounded-[32px] border border-white/10 bg-[#0d0d0d] p-6 md:p-8"
        aria-live="polite"
      >
        <p className="text-sm text-white/60">
          {loadError ?? "Polls unavailable."}
        </p>
      </section>
    );
  }

  return (
    <section
      className="min-w-0 w-full rounded-[32px] border border-[#62d0ea]/25 bg-[#0d0d0d] p-4 pb-5 pt-5 sm:p-5 lg:p-6"
      aria-labelledby="network-pulse-heading"
    >
      <div
        id="network-pulse-trigger"
        role="button"
        tabIndex={0}
        aria-expanded={pulseOpen}
        aria-controls="network-pulse-panel"
        aria-label={
          pulseOpen
            ? "Collapse Network Pulse polls"
            : "Expand Network Pulse polls"
        }
        onClick={() => setPulseOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPulseOpen((o) => !o);
          }
        }}
        className="flex h-auto min-h-[63px] w-full cursor-pointer flex-col items-stretch gap-3 pr-4 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d] sm:flex-row sm:items-center sm:gap-3 sm:pr-6"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-h-[29px] items-center">
            <h2
              id="network-pulse-heading"
              className="text-xl font-bold leading-normal text-[#5dc4dc] md:text-2xl md:leading-normal"
            >
              They say it&apos;s not what you&apos;re like but what you like
            </h2>
          </div>
          <p className="text-lg font-normal leading-normal text-white">
            Let&apos;s see how SEI is voting here by answering a few questions
          </p>
        </div>
        <span
          className="flex shrink-0 items-center justify-center self-start rounded-[24px] bg-[#141e21] px-4 py-3 text-[#62d0ea] sm:self-auto"
          aria-hidden
        >
          <span className="flex items-center gap-2.5 text-base font-normal whitespace-nowrap">
            share my interests
            {pulseOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2} />
            ) : (
              <ChevronUp className="h-4 w-4 shrink-0" strokeWidth={2} />
            )}
          </span>
        </span>
      </div>

      {voteError ? (
        <p
          className="mt-3 border-t border-white/10 pt-3 text-sm text-amber-400 md:pt-4"
          role="alert"
        >
          {voteError}
        </p>
      ) : null}

      <div
        id="network-pulse-panel"
        role="region"
        aria-labelledby="network-pulse-heading"
        hidden={!pulseOpen}
      >
        <div className="mt-2 flex min-w-0 flex-col gap-1 pt-2 sm:gap-2 sm:pt-3 lg:mt-3 lg:gap-[9px] lg:pt-3">
          {/*
            Poll carousel: flex-0-0-100% slides + touch-pan-y on vote buttons so
            horizontal swipes aren't eaten by iOS/Safari (buttons default to capturing pans).
          */}
          <div className="relative min-w-0 w-full max-w-full">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="relative flex w-full max-w-full min-w-0 flex-nowrap snap-x snap-mandatory gap-4 overflow-x-scroll overscroll-x-contain scroll-smooth pb-7 scrollbar-hide sm:pb-8 lg:gap-5 lg:pb-[4.5rem] touch-pan-x"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehaviorX: "contain",
              }}
            >
              {NETWORK_PULSE_POLLS.map((poll) => (
                <PulseQuestionCard
                  key={poll.pollId}
                  poll={poll}
                  payload={pollsState[poll.pollId]}
                  submitting={submittingPollId === poll.pollId}
                  onVote={(optionId) => void submitVote(poll, optionId)}
                />
              ))}
            </div>

            {NETWORK_PULSE_POLLS.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pt-0 lg:pt-6">
                <div
                  role="tablist"
                  aria-label="Pulse questions"
                  className="pointer-events-auto flex items-center justify-center gap-2"
                >
                  {NETWORK_PULSE_POLLS.map((poll, index) => (
                    <button
                      key={poll.pollId}
                      type="button"
                      role="tab"
                      aria-selected={index === activeSlide}
                      aria-label={`Question ${index + 1}: ${poll.question}`}
                      onClick={() => {
                        const el = scrollRef.current;
                        if (!el) return;
                        const stride = getSlideStride(el);
                        el.scrollTo({
                          left: stride * index,
                          behavior: "smooth",
                        });
                      }}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full p-2 touch-manipulation"
                    >
                      <span
                        className={cn(
                          "block rounded-2xl transition-[width,background-color] duration-200 ease-out",
                          index === activeSlide
                            ? "h-2 w-[38px] bg-[#62d0ea]"
                            : "size-2 rounded-full bg-white/35 hover:bg-white/50"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PulseMajorityBar({ majorityLabel }: { majorityLabel: string }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-[#62d0ea]/30 bg-[#070d10] px-4 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
      <span className="text-xs font-semibold text-white sm:text-sm">Majority</span>
      <span className="hidden text-white/35 sm:inline" aria-hidden>
        :
      </span>
      <span className="rounded-full bg-[#62d0ea]/22 px-3 py-1 text-center text-[11px] font-medium leading-snug text-[#62d0ea] ring-1 ring-inset ring-[#62d0ea]/35 sm:text-xs">
        {majorityLabel}
      </span>
    </div>
  );
}

function PulseQuestionCard({
  poll,
  payload,
  submitting,
  onVote,
}: {
  poll: NetworkPulsePollDefinition;
  payload: NetworkPulsePollPayload | undefined;
  submitting: boolean;
  onVote: (optionId: string) => void;
}) {
  const counts = payload?.counts ?? {};
  const percentages = payload?.percentages ?? {};
  const userVote = payload?.userVote ?? null;
  const total = payload?.total ?? 0;
  const majorityLabel = payload?.majorityLabel ?? "";
  const showResults = total > 0;

  return (
    <article
      data-pulse-slide
      className="box-border flex max-h-[min(520px,72dvh)] min-h-0 max-w-none shrink-0 grow-0 snap-center basis-full flex-col"
      aria-label={poll.question}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#62d0ea]/22 bg-[#0d0d0d] shadow-inner shadow-black/20">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y px-3 py-4 md:px-5 md:py-7 lg:px-[34px] lg:py-8"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex w-full flex-col gap-4 sm:gap-5 md:gap-[19px] lg:flex-row lg:items-center lg:justify-between lg:gap-8 xl:gap-10">
            <h3 className="shrink-0 text-center text-base font-bold leading-snug text-[#62d0ea] lg:max-w-[42%] lg:text-left xl:max-w-[40%]">
              {poll.question}
            </h3>

            <div
              className="flex w-full min-w-0 flex-col gap-2.5 sm:gap-3 lg:max-w-[582px] lg:flex-1 lg:flex-row lg:items-center lg:justify-end lg:gap-2.5"
              role="group"
              aria-label="Choices"
            >
            {poll.options.map((opt) => {
              const selected = userVote === opt.id;
              const pct = showResults ? (percentages[opt.id] ?? 0) : null;
              const count = counts[opt.id] ?? 0;
              /** Every option shows “N% : Label” once there are votes; chosen row gets stronger teal. */
              const voteLabel =
                showResults && pct !== null
                  ? `${pct}% : ${opt.label}`
                  : opt.label;

              const fillColor = selected ? "#3db8d4" : "rgba(61, 79, 87, 0.92)";
              const remainderColor = selected ? "rgba(30, 52, 58, 0.95)" : "#0a0e10";

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={Boolean(userVote) || submitting}
                  onClick={() => onVote(opt.id)}
                  title={
                    showResults
                      ? `${count} vote${count === 1 ? "" : "s"} · ${pct}%`
                      : undefined
                  }
                  className={cn(
                    "relative isolate flex min-h-[48px] w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl px-3 py-2 text-base font-medium transition-[border-color,box-shadow,background-color] duration-200 sm:px-4 sm:text-[17px] lg:px-6 lg:text-lg xl:px-8",
                    showResults && "xl:px-6",
                    !showResults && "xl:px-[50px] xl:text-xl",
                    showResults
                      ? cn(
                          "border text-white shadow-none",
                          selected
                            ? "border-2 border-[#62d0ea] shadow-[0_0_12px_rgba(98,208,234,0.18)]"
                            : "border border-white/22"
                        )
                      : selected
                        ? "border border-[#62d0ea]/50 bg-[#29606f] text-white shadow-[0_0_0_1px_rgba(98,208,234,0.12)]"
                        : userVote
                          ? "border border-white/10 bg-[#141e21] text-white/80"
                          : "border border-white/10 bg-[#141e21] text-white hover:border-[#62d0ea]/35 hover:bg-[#1a2830]"
                  )}
                  style={
                    showResults && pct !== null
                      ? {
                          background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${pct}%, ${remainderColor} ${pct}%, ${remainderColor} 100%)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "relative z-[1] max-w-full text-center normal-case tabular-nums",
                      showResults
                        ? cn(
                            "whitespace-nowrap text-sm leading-none tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.72)] sm:text-[15px] md:text-base lg:text-[17px]",
                            selected ? "font-semibold" : "font-medium"
                          )
                        : "xl:text-xl"
                    )}
                  >
                    {voteLabel}
                  </span>
                </button>
              );
            })}
            </div>
          </div>

          {showResults ? (
            <div className="mt-4 w-full sm:mt-5">
              <PulseMajorityBar majorityLabel={majorityLabel} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** @deprecated Use `NetworkPulseSection` */
export const NetworkPulsePoll = NetworkPulseSection;
