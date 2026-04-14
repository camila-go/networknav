"use client";

import type { ReactNode } from "react";
import type { Question, QuestionnaireData } from "@/types";
import { SingleSelect } from "./inputs/single-select";
import { MultiSelect } from "./inputs/multi-select";
import { MultiSelectCustom } from "./inputs/multi-select-custom";
import { IconSelect } from "./inputs/icon-select";
import { SliderInput } from "./inputs/slider-input";
import { RankInput } from "./inputs/rank-input";
import { SummitSingleSelect } from "./inputs/summit-single-select";
import { SummitMultiSelect } from "./inputs/summit-multi-select";
import { TextQuestionInput } from "./inputs/text-question-input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SummitQuestionCardMeta {
  current: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  onClose?: () => void;
}

interface QuestionCardProps {
  question: Question;
  value: QuestionnaireData[keyof QuestionnaireData];
  customValue?: string[];
  onChange: (value: QuestionnaireData[keyof QuestionnaireData]) => void;
  onCustomChange?: (customValues: string[]) => void;
  presentation?: "default" | "summit";
  summitMeta?: SummitQuestionCardMeta;
  /** Shown bottom-right inside summit card (e.g. Skip) */
  summitFooter?: React.ReactNode;
}

export function QuestionCard({
  question,
  value,
  customValue,
  onChange,
  onCustomChange,
  presentation = "default",
  summitMeta,
  summitFooter,
}: QuestionCardProps) {
  const isSummit = presentation === "summit";

  const body = (
    <>
      {!isSummit && (
        <div className="space-y-2">
          <h3 className="text-xl md:text-2xl font-bold text-white font-display">
            {question.text}
          </h3>
          {!question.required && (
            <Badge
              variant="secondary"
              className="text-xs font-medium bg-white/10 text-white/70"
            >
              Optional
            </Badge>
          )}
          {(question.type === "multi-select" ||
            question.type === "multi-select-custom") &&
            question.maxSelections && (
            <p className="text-sm text-white/60 font-medium">
              Select {question.minSelections}-{question.maxSelections} options
              {question.type === "multi-select-custom" && " (or add your own!)"}
            </p>
          )}
          {question.type === "rank" && (
            <p className="text-sm text-white/60 font-medium">
              Drag to rank your top {question.maxSelections || 3}
            </p>
          )}
        </div>
      )}

      {isSummit && question.type !== "text" && (
        <div className="mb-1 space-y-1">
          {!question.required && (
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Optional
            </p>
          )}
          {(question.type === "multi-select" ||
            question.type === "multi-select-custom") &&
            question.maxSelections && (
            <p className="text-xs text-zinc-500">
              Pick {question.minSelections ?? 1}-{question.maxSelections}
            </p>
          )}
        </div>
      )}

      <div className={cn("mt-4", isSummit && question.type === "text" && "mt-0")}>
        {question.type === "text" && (
          <TextQuestionInput
            value={typeof value === "string" ? value : ""}
            onChange={(v) => onChange(v)}
            placeholder={question.textPlaceholder}
            multiline={question.textMultiline}
          />
        )}

        {question.type === "single-select" &&
          (isSummit ? (
            <SummitSingleSelect
              options={question.options || []}
              value={value as string}
              onChange={(v) => onChange(v)}
            />
          ) : (
            <SingleSelect
              options={question.options || []}
              value={value as string}
              onChange={onChange}
            />
          ))}

        {question.type === "multi-select" &&
          (isSummit ? (
            <SummitMultiSelect
              options={question.options || []}
              value={(value as string[]) || []}
              onChange={onChange}
              minSelections={question.minSelections}
              maxSelections={question.maxSelections}
            />
          ) : (
            <MultiSelect
              options={question.options || []}
              value={(value as string[]) || []}
              onChange={onChange}
              minSelections={question.minSelections}
              maxSelections={question.maxSelections}
            />
          ))}

        {question.type === "multi-select-custom" && (
          <MultiSelectCustom
            options={question.options || []}
            value={(value as string[]) || []}
            customValues={customValue || []}
            onChange={onChange}
            onCustomChange={onCustomChange || (() => {})}
            minSelections={question.minSelections}
            maxSelections={question.maxSelections}
            placeholder={question.customFieldPlaceholder}
          />
        )}

        {question.type === "icon-select" && (
          <IconSelect
            options={question.options || []}
            value={value as string}
            onChange={onChange}
          />
        )}

        {question.type === "slider" && (
          <SliderInput
            options={question.options || []}
            value={value as string}
            onChange={onChange}
          />
        )}

        {question.type === "rank" && (
          <RankInput
            options={question.options || []}
            value={(value as string[]) || []}
            onChange={onChange}
            maxSelections={question.maxSelections || 3}
          />
        )}
      </div>
    </>
  );

  if (!isSummit) {
    return <div className="space-y-6">{body}</div>;
  }

  const questionForA11y = question.conversationalPrompt || question.text;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-800/90 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <div className="border-b border-white/[0.08] px-5 py-3 md:py-4">
        <div className="flex items-center justify-end gap-2">
          {/* Chat already surfaced the question — keep full wording for AT only. */}
          <span className="sr-only">{questionForA11y}</span>
          {summitMeta && (
            <div className="flex shrink-0 items-center gap-1 text-zinc-500">
              {summitMeta.onPrev && (
                <button
                  type="button"
                  aria-label="Previous question"
                  onClick={summitMeta.onPrev}
                  className="rounded p-1 hover:bg-white/10 hover:text-zinc-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-zinc-400">
                {summitMeta.current} of {summitMeta.total}
              </span>
              {summitMeta.onNext && (
                <button
                  type="button"
                  aria-label="Next question"
                  onClick={summitMeta.onNext}
                  className="rounded p-1 hover:bg-white/10 hover:text-zinc-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              {summitMeta.onClose && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={summitMeta.onClose}
                  className="ml-1 rounded p-1 hover:bg-white/10 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-4">{body}</div>
      {summitFooter ? (
        <div className="flex justify-end border-t border-white/[0.08] px-5 py-3">
          {summitFooter}
        </div>
      ) : null}
    </div>
  );
}
