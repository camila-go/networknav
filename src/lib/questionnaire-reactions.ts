/**
 * Canned reaction templates for the conversational questionnaire.
 * Used as fallback when AI-generated reactions are unavailable,
 * or as instant responses while AI generates something better.
 */

interface ReactionTemplate {
  match?: string | string[];
  reaction: string;
}

const reactions: Record<string, ReactionTemplate[]> = {
  roleSummary: [
    { reaction: "Love that framing — it'll help people find you fast." },
  ],
  archetype: [
    { match: "builder", reaction: "Builders are everywhere at this summit — you'll have good company." },
    { match: "connector", reaction: "Connectors make the whole event better. Thanks for being one." },
    { match: "strategist", reaction: "Strategic minds + this crowd = interesting hallway chats." },
    { reaction: "Solid pick — that'll help us line up the right intros." },
  ],
  teamQualities: [
    { reaction: "Great mix — teams need exactly those kinds of contributions." },
  ],
  growthArea: [
    { reaction: "Growth-minded — you'll find plenty of people here chasing the same thing." },
  ],
  talkTopic: [
    { reaction: "That's the kind of energy that sparks great conversations here." },
  ],
  refinedInterest: [
    { reaction: "Good nuance — that helps us tune who we surface for you." },
  ],
  personalInterest: [
    { reaction: "Nice — life outside work is half the story at events like this." },
  ],
  personalityTags: [
    { reaction: "Ha, I can picture the vibe already. Useful for matching rhythms with others." },
  ],
  joyTrigger: [
    { reaction: "Small wins count — I'll remember that helps you show up at your best." },
  ],
  threeWords: [
    { reaction: "Three words and I already feel like I know you a bit better." },
  ],
  headline: [
    { reaction: "Strong headline — that belongs on the wall." },
  ],
  funFact: [
    { reaction: "That's a great icebreaker — save it for the right moment." },
  ],
};

export function getCannedReaction(questionId: string, answer: string | string[]): string {
  const templates = reactions[questionId];
  if (!templates) {
    return "Got it! Let's keep going.";
  }

  const answerValues = Array.isArray(answer) ? answer : [answer];

  for (const template of templates) {
    if (!template.match) continue;
    const matchValues = Array.isArray(template.match) ? template.match : [template.match];
    if (answerValues.some((a) => matchValues.includes(a))) {
      return template.reaction;
    }
  }

  const fallback = templates.find((t) => !t.match);
  return fallback?.reaction || "Got it! Let's keep going.";
}
