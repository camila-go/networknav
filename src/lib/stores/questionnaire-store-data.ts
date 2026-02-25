/**
 * In-memory questionnaire response store (replace with database in production)
 *
 * Uses globalThis so the Map is shared across Next.js route compilations.
 */

export interface StoredQuestionnaireResponse {
  userId: string;
  responses: Record<string, unknown>;
  completionPercentage: number;
  completedAt?: Date;
  lastUpdated: Date;
}

const g = globalThis as unknown as { __netnav_questionnaire?: Map<string, StoredQuestionnaireResponse> };
export const questionnaireResponses = (g.__netnav_questionnaire ??= new Map<string, StoredQuestionnaireResponse>());
