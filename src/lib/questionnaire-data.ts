import type { QuestionSection } from "@/types";

export const QUESTIONNAIRE_SECTIONS: QuestionSection[] = [
  // ============================================
  // SECTION 1: Your Leadership Context
  // ============================================
  {
    id: "leadership-context",
    title: "Your Leadership Context",
    subtitle: "Quick intro - this takes about 60 seconds",
    icon: "🎯",
    questions: [
      {
        id: "industry",
        text: "What industry are you leading in?",
        type: "single-select",
        required: true,
        options: [
          { value: "technology", label: "Technology", icon: "💻" },
          { value: "finance", label: "Finance & Banking", icon: "💰" },
          { value: "healthcare", label: "Healthcare", icon: "🏥" },
          { value: "education", label: "Education", icon: "📚" },
          { value: "nonprofit", label: "Non-profit", icon: "❤️" },
          { value: "manufacturing", label: "Manufacturing", icon: "🏭" },
          { value: "retail", label: "Retail & E-commerce", icon: "🛍️" },
          { value: "professional-services", label: "Professional Services", icon: "💼" },
          { value: "consulting", label: "Consulting", icon: "📊" },
          { value: "media", label: "Media & Entertainment", icon: "🎬" },
          { value: "other", label: "Other", icon: "🔧" },
        ],
      },
      {
        id: "yearsExperience",
        text: "How many years have you been in leadership roles?",
        type: "slider",
        required: true,
        options: [
          { value: "0-2", label: "New to leadership (0-2 years)" },
          { value: "3-5", label: "Emerging leader (3-5 years)" },
          { value: "6-10", label: "Experienced leader (6-10 years)" },
          { value: "11-15", label: "Seasoned leader (11-15 years)" },
          { value: "16-20", label: "Veteran leader (16-20 years)" },
          { value: "20+", label: "20+ years leading" },
        ],
      },
      {
        id: "leadershipLevel",
        text: "What best describes your leadership level?",
        type: "icon-select",
        required: true,
        options: [
          { value: "c-suite", label: "C-Suite", icon: "🏢", description: "CEO, COO, CFO, CTO, etc." },
          { value: "senior-executive", label: "Senior Executive", icon: "🎯", description: "SVP, EVP" },
          { value: "vp", label: "VP / Executive Director", icon: "📊" },
          { value: "director", label: "Director / Senior Manager", icon: "⭐" },
          { value: "manager", label: "Manager / Team Lead", icon: "💪" },
          { value: "founder", label: "Founder / Entrepreneur", icon: "🚀" },
        ],
      },
    ],
  },

  // ============================================
  // SECTION 2: Your Goals & Interests
  // ============================================
  {
    id: "goals-interests",
    title: "Your Goals & Interests",
    subtitle: "Help us find the right connections for you",
    icon: "🚀",
    questions: [
      {
        id: "leadershipPriorities",
        text: "What are your top leadership priorities right now?",
        type: "multi-select",
        required: true,
        minSelections: 2,
        maxSelections: 4,
        options: [
          { value: "scaling", label: "Scaling the team or organization", icon: "📈" },
          { value: "transformation", label: "Leading organizational transformation", icon: "🔄" },
          { value: "innovation", label: "Driving innovation and new initiatives", icon: "💡" },
          { value: "mentoring", label: "Developing and mentoring future leaders", icon: "👥" },
          { value: "strategy", label: "Refining strategy and vision", icon: "🎯" },
          { value: "culture", label: "Building stronger team culture", icon: "🤝" },
          { value: "work-life", label: "Managing work-life integration", icon: "⚖️" },
          { value: "excellence", label: "Achieving operational excellence", icon: "🏆" },
        ],
      },
      {
        id: "networkingGoals",
        text: "What would make this conference networking valuable for you?",
        type: "multi-select",
        required: true,
        minSelections: 2,
        maxSelections: 3,
        options: [
          { value: "mentors", label: "Finding mentors or advisors", icon: "🧭" },
          { value: "peers", label: "Connecting with peers facing similar challenges", icon: "🤝" },
          { value: "cross-industry", label: "Learning from leaders in different industries", icon: "💡" },
          { value: "partnerships", label: "Exploring collaboration opportunities", icon: "🔄" },
          { value: "give-back", label: "Sharing my expertise and giving back", icon: "🎤" },
          { value: "expand-network", label: "Expanding my professional network", icon: "🌟" },
        ],
      },
      {
        id: "rechargeActivities",
        text: "How do you recharge outside of work?",
        type: "multi-select-custom",
        required: true,
        minSelections: 3,
        maxSelections: 8,
        customFieldId: "customInterests",
        customFieldPlaceholder: "Add your own interest (e.g., Pottery, Hiking, Board games)",
        options: [
          { value: "reading", label: "Reading (business or pleasure)", icon: "📚" },
          { value: "fitness", label: "Fitness & Sports", icon: "🏃" },
          { value: "gaming", label: "Gaming", icon: "🎮" },
          { value: "cooking", label: "Cooking & Culinary adventures", icon: "🍳" },
          { value: "travel", label: "Travel & Exploration", icon: "✈️" },
          { value: "music", label: "Music (listening or playing)", icon: "🎵" },
          { value: "creative", label: "Creative pursuits", icon: "🎨" },
          { value: "volunteering", label: "Volunteering & Community service", icon: "🤲" },
          { value: "outdoors", label: "Outdoor Adventures", icon: "🏔️" },
          { value: "movies", label: "Movies & Entertainment", icon: "🎬" },
          { value: "meditation", label: "Meditation & Mindfulness", icon: "🧘" },
          { value: "learning", label: "Continuous learning", icon: "🎓" },
        ],
      },
    ],
  },

  // ============================================
  // SECTION 3: Your Style
  // ============================================
  {
    id: "leadership-style",
    title: "Your Style",
    subtitle: "Almost done! This helps us find your tribe",
    icon: "🤝",
    questions: [
      {
        id: "leadershipPhilosophy",
        text: "How would you describe your leadership philosophy?",
        type: "multi-select",
        required: true,
        minSelections: 2,
        maxSelections: 4,
        options: [
          { value: "servant", label: "Servant leadership - I serve my team", icon: "🤝" },
          { value: "results", label: "Results-driven - focused on outcomes", icon: "🎯" },
          { value: "people-first", label: "People-first - relationships matter most", icon: "👥" },
          { value: "visionary", label: "Visionary - painting the future", icon: "💡" },
          { value: "coach", label: "Coach and developer - growing others", icon: "🎓" },
          { value: "data-informed", label: "Data-informed - metrics guide decisions", icon: "📊" },
          { value: "collaborative", label: "Collaborative - we win together", icon: "🤲" },
          { value: "decisive", label: "Decisive - moving fast and adapting", icon: "⚡" },
        ],
      },
      {
        id: "communicationStyle",
        text: "How do you prefer to communicate?",
        type: "single-select",
        required: true,
        options: [
          { value: "direct", label: "Direct and straight to the point", icon: "💬" },
          { value: "warm", label: "Warm and relationship-focused", icon: "🌊" },
          { value: "facts-first", label: "Data and facts first", icon: "📊" },
          { value: "storytelling", label: "Context and storytelling", icon: "📖" },
          { value: "efficient", label: "Quick and efficient", icon: "⚡" },
          { value: "deliberate", label: "Thoughtful and deliberate", icon: "🤔" },
        ],
      },
      {
        id: "relationshipValues",
        text: "What do you value most in professional relationships?",
        type: "multi-select",
        required: true,
        minSelections: 2,
        maxSelections: 3,
        options: [
          { value: "authenticity", label: "Authenticity - being real", icon: "💯" },
          { value: "expertise", label: "Expertise - learning from the best", icon: "🧠" },
          { value: "mutual-benefit", label: "Mutual benefit - helping each other", icon: "🤝" },
          { value: "trust", label: "Trust - knowing they have my back", icon: "🛡️" },
          { value: "innovation", label: "Innovation - thinking bigger together", icon: "💡" },
          { value: "shared-values", label: "Shared values - aligned on what matters", icon: "❤️" },
        ],
      },
      {
        id: "energizers",
        text: "What energizes you as a person?",
        type: "multi-select",
        required: true,
        minSelections: 2,
        maxSelections: 4,
        options: [
          { value: "deep-conversations", label: "Deep, meaningful conversations", icon: "🧠" },
          { value: "connecting", label: "Connecting with people", icon: "🎉" },
          { value: "winning", label: "Overcoming challenges", icon: "🏆" },
          { value: "growth", label: "Learning and personal growth", icon: "🌱" },
          { value: "helping", label: "Helping others succeed", icon: "🤝" },
          { value: "creating", label: "Creating something new", icon: "🎨" },
          { value: "new-experiences", label: "New experiences", icon: "🌍" },
        ],
      },
    ],
  },
];

// Helper functions
export function getTotalQuestions(): number {
  return QUESTIONNAIRE_SECTIONS.reduce(
    (total, section) => total + section.questions.length,
    0
  );
}

export function getRequiredQuestions(): number {
  return QUESTIONNAIRE_SECTIONS.reduce(
    (total, section) =>
      total + section.questions.filter((q) => q.required).length,
    0
  );
}

export function getSectionProgress(
  sectionIndex: number,
  totalSections: number = QUESTIONNAIRE_SECTIONS.length
): number {
  return Math.round(((sectionIndex + 1) / totalSections) * 100);
}

export function getSectionById(id: string): QuestionSection | undefined {
  return QUESTIONNAIRE_SECTIONS.find((section) => section.id === id);
}

export function getQuestionById(
  questionId: string
): { section: QuestionSection; question: (typeof QUESTIONNAIRE_SECTIONS)[0]["questions"][0] } | undefined {
  for (const section of QUESTIONNAIRE_SECTIONS) {
    const question = section.questions.find((q) => q.id === questionId);
    if (question) {
      return { section, question };
    }
  }
  return undefined;
}

