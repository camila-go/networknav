import {
  getQuestionById,
  PERSONAL_INTEREST_PHOTO_QUESTION,
  QUESTIONNAIRE_SECTIONS,
} from "@/lib/questionnaire-data";
import type { QuestionnaireData } from "@/types";

export type ProfileAnswerRow = {
  id: string;
  label: string;
  value: string;
};

function optionLabelsForQuestion(
  questionId: string,
  values: string[]
): string {
  const meta = getQuestionById(questionId);
  if (!meta?.question.options?.length) {
    return values.map((v) => v.replace(/-/g, " ")).join(", ");
  }
  return values
    .map((v) => {
      const opt = meta.question.options!.find((o) => o.value === v);
      return opt?.label ?? v.replace(/-/g, " ");
    })
    .join(", ");
}

function formatValue(
  key: keyof QuestionnaireData,
  raw: unknown
): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    const meta = getQuestionById(key);
    const opt = meta?.question.options?.find((o) => o.value === t);
    if (opt) return opt.label;
    return t;
  }
  if (Array.isArray(raw)) {
    const strs = raw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    if (!strs.length) return null;
    return optionLabelsForQuestion(key, strs);
  }
  return null;
}

/**
 * Human-readable rows for profile UI (order matches the summit guide).
 */
export function profileAnswerRowsFromQuestionnaire(
  data: Record<string, unknown> | null | undefined
): ProfileAnswerRow[] {
  if (!data || typeof data !== "object") return [];

  const rows: ProfileAnswerRow[] = [];

  for (const section of QUESTIONNAIRE_SECTIONS) {
    for (const q of section.questions) {
      const key = q.id;
      const formatted = formatValue(key, data[key]);
      if (formatted) {
        rows.push({
          id: key,
          label: q.text.replace(/\s+/g, " ").trim(),
          value: formatted,
        });
      }
    }
  }

  const refined = formatValue(
    "refinedInterest",
    data["refinedInterest"]
  );
  if (refined) {
    const afterTalk = rows.findIndex((r) => r.id === "talkTopic");
    const row: ProfileAnswerRow = {
      id: "refinedInterest",
      label: "More on your conversation topic",
      value: refined,
    };
    if (afterTalk >= 0) rows.splice(afterTalk + 1, 0, row);
    else rows.push(row);
  }

  const photoMeta = data.personalInterestPhoto;
  if (photoMeta === "uploaded" || photoMeta === "skipped") {
    rows.push({
      id: "personalInterestPhoto",
      label: PERSONAL_INTEREST_PHOTO_QUESTION.text,
      value:
        photoMeta === "uploaded"
          ? "You added an activity photo to your gallery"
          : "Skipped (you can add one later in Photo Gallery)",
    });
  }

  return rows;
}
