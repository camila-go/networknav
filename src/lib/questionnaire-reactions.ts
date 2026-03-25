/**
 * Canned reaction templates for the conversational questionnaire.
 * Used as fallback when AI-generated reactions are unavailable,
 * or as instant responses while AI generates something better.
 */

interface ReactionTemplate {
  /** Values to match against user's answer (single value or array) */
  match?: string | string[];
  /** The reaction text */
  reaction: string;
}

const reactions: Record<string, ReactionTemplate[]> = {
  yearsExperience: [
    { match: ["0-2", "3-5"], reaction: "Fresh perspective is gold at a summit like this — you're going to make some great connections." },
    { match: ["6-10", "11-15"], reaction: "That's a solid foundation. You've seen enough to know what really matters." },
    { match: ["16-20", "20+"], reaction: "That depth of experience is exactly what makes connections here so valuable." },
    { reaction: "Great — that context helps me find your best matches." },
  ],
  leadershipLevel: [
    { match: "c-suite", reaction: "The view from the top — you'll find some great peers here to compare notes with." },
    { match: "senior-executive", reaction: "Senior leadership is where strategy meets execution. Lots of people here who get that." },
    { match: "vp", reaction: "VP level is where things get really interesting. You're bridging vision and action every day." },
    { match: "director", reaction: "Directors are the engine room of any organization. You'll find kindred spirits here." },
    { match: "manager", reaction: "Team leads bring such a grounded perspective. That's valuable here." },
    { match: "founder", reaction: "Founders bring such a unique lens to everything. Love it." },
    { reaction: "Noted! That helps me understand what kind of connections will be most valuable for you." },
  ],
  leadershipPriorities: [
    { match: "scaling", reaction: "Scaling is one of those challenges that's equal parts thrilling and exhausting. You're not alone in that." },
    { match: "transformation", reaction: "Leading transformation takes real courage. I'll connect you with others navigating big changes too." },
    { match: "innovation", reaction: "Innovation-minded leaders tend to have the best conversations at these events." },
    { match: "mentoring", reaction: "The fact that developing others is a priority says a lot about you as a leader." },
    { reaction: "Love those priorities. I'm already thinking about who you need to meet." },
  ],
  networkingGoals: [
    { match: "mentors", reaction: "Finding the right mentor can be career-changing. Let's make that happen." },
    { match: "peers", reaction: "There's nothing like connecting with someone who truly gets what you're going through." },
    { match: "cross-industry", reaction: "Cross-industry insights are where the real breakthroughs happen." },
    { match: "give-back", reaction: "Leaders who want to give back make the best connections. Full stop." },
    { reaction: "Perfect — I know exactly the kind of matches to look for." },
  ],
  rechargeActivities: [
    { match: "fitness", reaction: "A leader who prioritizes fitness — your future matches will probably want to grab a morning run together!" },
    { match: "reading", reaction: "A reader! I bet your book recommendations are top-tier." },
    { match: "cooking", reaction: "Cooking is such a great creative outlet. Maybe you'll find a fellow foodie here." },
    { match: "travel", reaction: "Travel lovers tend to be the most interesting conversationalists. Makes sense." },
    { match: "gaming", reaction: "Gamers bring such great strategic thinking to leadership. Nice pick." },
    { reaction: "These are great — shared hobbies make for the best icebreakers at events like this." },
  ],
  leadershipPhilosophy: [
    { match: "servant", reaction: "Servant leadership — that's a philosophy that earns deep loyalty. Respect." },
    { match: "visionary", reaction: "Visionaries keep organizations moving forward. The world needs more of that." },
    { match: "collaborative", reaction: "Collaboration as a core value — your team must love working with you." },
    { match: "results", reaction: "Results-driven and proud of it. Nothing wrong with keeping score." },
    { reaction: "That tells me a lot about how you show up as a leader. Really helpful." },
  ],
  communicationStyle: [
    { match: "direct", reaction: "Direct communicators are refreshing — no guessing games. I like it." },
    { match: "warm", reaction: "Warm communicators build the kind of trust that lasts. That's a superpower." },
    { match: "storytelling", reaction: "Storytellers have a way of making ideas stick. That's a real gift." },
    { match: "efficient", reaction: "Efficient and to the point — you probably run great meetings too." },
    { match: "deliberate", reaction: "Thoughtful communication builds real understanding. That's underrated." },
    { reaction: "Good to know — I'll factor that into your matches too." },
  ],
  relationshipValues: [
    { match: "authenticity", reaction: "Authenticity first — that's the foundation of every meaningful connection." },
    { match: "trust", reaction: "Trust is everything. The best professional relationships are built on it." },
    { match: "mutual-benefit", reaction: "Mutual benefit — that's the networking sweet spot right there." },
    { reaction: "Those values will definitely shape the kind of matches I find for you." },
  ],
  energizers: [
    { match: "deep-conversations", reaction: "Deep conversations at a leadership conference? You're going to be in your element." },
    { match: "helping", reaction: "Leaders who are energized by helping others — those are the ones people remember." },
    { match: "growth", reaction: "A growth mindset as an energizer — that's the kind of leader people want to be around." },
    { match: "creating", reaction: "Creators bring a special kind of energy to any room they walk into." },
    { reaction: "Love that. I've got a really good picture of who you are now." },
  ],
};

/**
 * Get a canned reaction for a question based on the user's answer.
 * Checks specific matches first, falls back to a universal reaction.
 */
export function getCannedReaction(questionId: string, answer: string | string[]): string {
  const templates = reactions[questionId];
  if (!templates) {
    return "Got it! Let's keep going.";
  }

  const answerValues = Array.isArray(answer) ? answer : [answer];

  // Try to find a specific match (check the first answer value for multi-select)
  for (const template of templates) {
    if (!template.match) continue;
    const matchValues = Array.isArray(template.match) ? template.match : [template.match];
    if (answerValues.some((a) => matchValues.includes(a))) {
      return template.reaction;
    }
  }

  // Fall back to universal reaction (last template without a match)
  const fallback = templates.find((t) => !t.match);
  return fallback?.reaction || "Got it! Let's keep going.";
}
