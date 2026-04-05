"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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
      className="w-full overflow-hidden rounded-[32px] border border-[#62d0ea]/25 bg-[#0d0d0d] p-4 pb-5 pt-5 sm:p-5 lg:p-6"
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
        className="flex h-auto min-h-[63px] w-full cursor-pointer items-center gap-3 pr-6 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-3">
          <div className="flex min-h-[25px] items-center md:min-h-[29px]">
            <h2
              id="network-pulse-heading"
              className="text-xl font-bold leading-none text-[#5dc4dc] md:text-2xl"
            >
              Network Pulse
            </h2>
          </div>
          <p className="text-base font-normal leading-normal text-white md:text-lg">
            Help us get a gauge on how SEI is voting here by answering a few
            questions
          </p>
        </div>
        <span
          className="flex h-[38px] w-[42px] shrink-0 items-center justify-center text-[#62d0ea]"
          aria-hidden
        >
          <ChevronDown
            className={cn(
              "h-6 w-6 shrink-0 transition-transform duration-200 ease-out",
              pulseOpen && "rotate-180"
            )}
            strokeWidth={2}
          />
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
        <div className="mt-2 flex flex-col gap-1 pt-2 sm:gap-2 sm:pt-3 lg:mt-3 lg:gap-[9px] lg:pt-3">
          <div className="relative w-full">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex w-full min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-7 scrollbar-hide sm:pb-8 lg:gap-5 lg:pb-[4.5rem]"
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

function PulseMajorityPill({ majorityLabel }: { majorityLabel: string }) {
  return (
    <div className="flex w-full max-w-full shrink-0 justify-start rounded-xl border border-[#62d0ea]/20 bg-black/50 px-3 py-2 sm:px-4 sm:py-2.5 lg:inline-flex lg:w-fit lg:max-w-none lg:py-2">
      <p className="w-full max-w-[11.5rem] text-left text-[11px] font-semibold uppercase leading-snug tracking-[0.06em] text-white/70 sm:max-w-[14rem] sm:text-xs lg:w-[min(203px,100%)] lg:max-w-[203px]">
        <span className="font-semibold text-[#62d0ea]">MAJORITY · </span>
        <span className="font-bold text-white">{majorityLabel}</span>
      </p>
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
  const majorityOptionId = payload?.majorityOptionId;
  const majorityLabel = payload?.majorityLabel ?? "";
  const showResults = total > 0;

  return (
    <article
      data-pulse-slide
      className="box-border w-full min-w-full max-w-none shrink-0 snap-center"
      aria-label={poll.question}
    >
      <div className="rounded-xl border border-white/[0.06] bg-[#0d0d0d] px-3 py-4 shadow-inner shadow-black/20 md:px-5 md:py-7 lg:px-[34px] lg:py-8">
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
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={Boolean(userVote) || submitting}
                  onClick={() => onVote(opt.id)}
                  className={cn(
                    "flex min-h-[48px] w-full min-w-0 flex-1 items-center justify-center rounded-xl border px-4 py-2 text-base font-medium transition-colors sm:px-5 sm:text-[17px] lg:px-8 lg:text-lg xl:px-[50px] xl:text-xl",
                    selected
                      ? "border-[#62d0ea]/50 bg-[#29606f] text-white shadow-[0_0_0_1px_rgba(98,208,234,0.12)]"
                      : userVote
                        ? "border-white/10 bg-[#141e21] text-white/80"
                        : "border-white/10 bg-[#141e21] text-white hover:border-[#62d0ea]/35 hover:bg-[#1a2830]"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {showResults ? (
          <div className="mt-3 flex w-full min-w-0 flex-col gap-4 rounded-xl border border-white/[0.07] bg-[#141e21]/95 p-3 sm:mt-3 sm:gap-4 sm:p-4 lg:mt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:p-4 xl:gap-8">
            <div className="shrink-0 lg:max-w-[min(220px,42%)]">
              <PulseMajorityPill majorityLabel={majorityLabel} />
            </div>

            <div
              className={cn(
                "grid w-full min-w-0 flex-1 grid-cols-1 gap-3 sm:gap-3.5",
                poll.options.length === 2
                  ? "sm:grid-cols-2"
                  : "md:grid-cols-3 md:gap-2.5 lg:gap-3"
              )}
            >
              {poll.options.map((opt) => {
                const pct = percentages[opt.id] ?? 0;
                const count = counts[opt.id] ?? 0;
                const isLeader =
                  opt.id === majorityOptionId && total > 0;
                const labelUpper = opt.label.toUpperCase();
                const trackShell = isLeader
                  ? "border-[#62d0ea]/35 bg-[#62d0ea]/10"
                  : "border-white/10 bg-black/30";
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      "flex min-w-0 w-full items-center gap-2 rounded-lg border px-2 py-1.5 sm:min-w-0 sm:gap-2 sm:px-2.5 md:gap-2.5",
                      trackShell
                    )}
                    title={`${count} vote${count === 1 ? "" : "s"}`}
                  >
                    <span
                      className={cn(
                        "w-[3.25rem] shrink-0 truncate text-[9px] font-medium uppercase leading-none tracking-wide sm:w-14 sm:text-[10px]",
                        isLeader ? "text-[#62d0ea]" : "text-[#757575]"
                      )}
                    >
                      {labelUpper}
                    </span>
                    <div
                      className={cn(
                        "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10 sm:h-2",
                        pct === 0 && "opacity-60"
                      )}
                    >
                      {pct > 0 ? (
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isLeader ? "bg-[#62d0ea]" : "bg-white/35"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "w-8 shrink-0 text-right tabular-nums text-[9px] sm:w-9 sm:text-[10px]",
                        isLeader ? "font-semibold text-white" : "text-[#757575]"
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** @deprecated Use `NetworkPulseSection` */
export const NetworkPulsePoll = NetworkPulseSection;
