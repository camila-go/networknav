"use client";

import type { Question, QuestionnaireData } from "@/types";
import { SingleSelect } from "./inputs/single-select";
import { MultiSelect } from "./inputs/multi-select";
import { MultiSelectCustom } from "./inputs/multi-select-custom";
import { IconSelect } from "./inputs/icon-select";
import { SliderInput } from "./inputs/slider-input";
import { RankInput } from "./inputs/rank-input";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  question: Question;
  value: QuestionnaireData[keyof QuestionnaireData];
  customValue?: string[];
  onChange: (value: QuestionnaireData[keyof QuestionnaireData]) => void;
  onCustomChange?: (customValues: string[]) => void;
}

export function QuestionCard({ question, value, customValue, onChange, onCustomChange }: QuestionCardProps) {
  return (
    <div className="space-y-6">
      {/* Question text */}
      <div className="space-y-2">
        <h3 className="text-xl md:text-2xl font-bold text-navy-800 font-display">
          {question.text}
        </h3>
        {!question.required && (
          <Badge variant="secondary" className="text-xs font-medium">
            Optional
          </Badge>
        )}
        {(question.type === "multi-select" || question.type === "multi-select-custom") && question.maxSelections && (
          <p className="text-sm text-navy-600 font-medium">
            Select {question.minSelections}-{question.maxSelections} options
            {question.type === "multi-select-custom" && " (or add your own!)"}
          </p>
        )}
        {question.type === "rank" && (
          <p className="text-sm text-navy-600 font-medium">
            Drag to rank your top {question.maxSelections || 3}
          </p>
        )}
      </div>

      {/* Input based on question type */}
      <div className="mt-4">
        {question.type === "single-select" && (
          <SingleSelect
            options={question.options || []}
            value={value as string}
            onChange={onChange}
          />
        )}

        {question.type === "multi-select" && (
          <MultiSelect
            options={question.options || []}
            value={(value as string[]) || []}
            onChange={onChange}
            minSelections={question.minSelections}
            maxSelections={question.maxSelections}
          />
        )}

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
    </div>
  );
}

