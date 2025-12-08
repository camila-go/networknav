import type { QuestionSection } from "@/types";

export const QUESTIONNAIRE_SECTIONS: QuestionSection[] = [
  // ============================================
  // SECTION 1: Your Leadership Context
  // ============================================
  {
    id: "leadership-context",
    title: "Your Leadership Context",
    subtitle: "Let's start with where you lead - this should take about 90 seconds",
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
          { value: "government", label: "Government", icon: "🏛️" },
          { value: "consulting", label: "Consulting", icon: "📊" },
          { value: "media", label: "Media & Entertainment", icon: "🎬" },
          { value: "real-estate", label: "Real Estate", icon: "🏠" },
          { value: "energy", label: "Energy & Utilities", icon: "⚡" },
          { value: "transportation", label: "Transportation & Logistics", icon: "🚚" },
          { value: "hospitality", label: "Hospitality & Tourism", icon: "🏨" },
          { value: "agriculture", label: "Agriculture", icon: "🌾" },
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
          { value: "emerging", label: "Emerging Leader / Supervisor", icon: "🌱" },
          { value: "founder", label: "Founder / Entrepreneur", icon: "🚀" },
        ],
      },
      {
        id: "organizationSize",
        text: "What's the size of your organization?",
        type: "single-select",
        required: true,
        options: [
          { value: "startup", label: "Startup (1-50 employees)" },
          { value: "small", label: "Small business (51-200)" },
          { value: "mid-size", label: "Mid-size (201-1,000)" },
          { value: "large", label: "Large (1,001-10,000)" },
          { value: "enterprise", label: "Enterprise (10,000+)" },
          { value: "solo", label: "Solo entrepreneur / Consultant" },
        ],
      },
    ],
  },

  // ============================================
  // SECTION 2: What You're Building & Solving
  // ============================================
  {
    id: "building-solving",
    title: "What You're Building & Solving",
    subtitle: "Tell us about your leadership journey and challenges",
    icon: "🚀",
    questions: [
      {
        id: "leadershipPriorities",
        text: "What are your top leadership priorities right now?",
        type: "multi-select",
        required: true,
        minSelections: 3,
        maxSelections: 5,
        options: [
          { value: "scaling", label: "Scaling the team or organization", icon: "📈" },
          { value: "transformation", label: "Leading organizational transformation", icon: "🔄" },
          { value: "innovation", label: "Driving innovation and new initiatives", icon: "💡" },
          { value: "mentoring", label: "Developing and mentoring future leaders", icon: "👥" },
          { value: "financial", label: "Improving financial performance", icon: "💰" },
          { value: "strategy", label: "Refining strategy and vision", icon: "🎯" },
          { value: "culture", label: "Building stronger team culture", icon: "🤝" },
          { value: "expansion", label: "Expanding into new markets", icon: "🌐" },
          { value: "work-life", label: "Managing work-life integration", icon: "⚖️" },
          { value: "excellence", label: "Achieving operational excellence", icon: "🏆" },
        ],
      },
      {
        id: "leadershipChallenges",
        text: "What leadership challenges keep you up at night?",
        type: "multi-select",
        required: true,
        minSelections: 3,
        maxSelections: 5,
        options: [
          { value: "talent", label: "Attracting and retaining top talent", icon: "👥" },
          { value: "change", label: "Managing change and resistance", icon: "🔄" },
          { value: "priorities", label: "Balancing competing priorities", icon: "📊" },
          { value: "communication", label: "Improving communication across the org", icon: "💬" },
          { value: "politics", label: "Navigating office politics and dynamics", icon: "🎭" },
          { value: "budget", label: "Doing more with less / Budget constraints", icon: "📉" },
          { value: "pipeline", label: "Developing leadership pipeline", icon: "🌱" },
          { value: "buy-in", label: "Getting buy-in for new initiatives", icon: "🎯" },
          { value: "disruption", label: "Keeping pace with industry disruption", icon: "⚡" },
          { value: "decisions", label: "Making high-stakes decisions with uncertainty", icon: "🧭" },
          { value: "burnout", label: "Preventing burnout (mine or my team's)", icon: "🔥" },
        ],
      },
      {
        id: "growthAreas",
        text: "What areas of leadership are you looking to grow in?",
        type: "multi-select",
        required: true,
        minSelections: 3,
        maxSelections: 5,
        options: [
          { value: "presence", label: "Executive presence and influence", icon: "🗣️" },
          { value: "strategic", label: "Strategic thinking and planning", icon: "💭" },
          { value: "financial-acumen", label: "Financial acumen and business strategy", icon: "💰" },
          { value: "teams", label: "Building and leading high-performing teams", icon: "🤝" },
          { value: "storytelling", label: "Communication and storytelling", icon: "📢" },
          { value: "change-mgmt", label: "Change management and transformation", icon: "🔄" },
          { value: "creative", label: "Innovation and creative problem-solving", icon: "💡" },
          { value: "dei", label: "Leading diverse and inclusive teams", icon: "🌍" },
          { value: "digital", label: "Digital transformation and technology", icon: "🤖" },
          { value: "data-driven", label: "Data-driven decision making", icon: "📊" },
          { value: "emotional-intel", label: "Emotional intelligence and resilience", icon: "🧘" },
          { value: "negotiation", label: "Negotiation and conflict resolution", icon: "🎯" },
        ],
      },
      {
        id: "networkingGoals",
        text: "What would make this conference networking valuable for you?",
        type: "multi-select",
        required: true,
        minSelections: 2,
        maxSelections: 4,
        options: [
          { value: "mentors", label: "Finding mentors or advisors who've been there", icon: "🧭" },
          { value: "peers", label: "Connecting with peers facing similar challenges", icon: "🤝" },
          { value: "cross-industry", label: "Learning from leaders in different industries", icon: "💡" },
          { value: "partnerships", label: "Exploring partnership or collaboration opportunities", icon: "🔄" },
          { value: "resources", label: "Discovering resources and solutions for my challenges", icon: "📚" },
          { value: "give-back", label: "Sharing my expertise and giving back", icon: "🎤" },
          { value: "expand-network", label: "Expanding my professional network strategically", icon: "🌟" },
          { value: "career", label: "Exploring new career opportunities", icon: "💼" },
        ],
      },
    ],
  },

  // ============================================
  // SECTION 3: Beyond the Boardroom
  // ============================================
  {
    id: "beyond-boardroom",
    title: "Beyond the Boardroom",
    subtitle: "Let's find your people - leaders are multidimensional too",
    icon: "🌟",
    questions: [
      {
        id: "rechargeActivities",
        text: "How do you recharge outside of work?",
        type: "multi-select",
        required: true,
        minSelections: 4,
        maxSelections: 8,
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
          { value: "photography", label: "Photography", icon: "📸" },
          { value: "writing", label: "Writing or Blogging", icon: "✍️" },
          { value: "diy", label: "DIY & Building projects", icon: "🔨" },
          { value: "gardening", label: "Gardening", icon: "🌿" },
          { value: "movies", label: "Movies & Entertainment", icon: "🎬" },
          { value: "meditation", label: "Meditation & Mindfulness", icon: "🧘" },
          { value: "learning", label: "Continuous learning & courses", icon: "🎓" },
        ],
      },
      {
        id: "contentPreferences",
        text: "What's in your content diet?",
        type: "multi-select",
        required: true,
        minSelections: 3,
        maxSelections: 6,
        options: [
          { value: "business", label: "Business & Leadership books/podcasts", icon: "📈" },
          { value: "entrepreneurship", label: "Entrepreneurship & Startups", icon: "🎙️" },
          { value: "fiction", label: "Fiction & Literature", icon: "📖" },
          { value: "history", label: "History & Biography", icon: "📜" },
          { value: "science", label: "Science & Innovation", icon: "🔬" },
          { value: "true-crime", label: "True Crime", icon: "🕵️" },
          { value: "psychology", label: "Psychology & Human Behavior", icon: "💡" },
          { value: "sports", label: "Sports", icon: "⚽" },
          { value: "arts", label: "Arts & Culture", icon: "🎨" },
          { value: "news", label: "News & Current Affairs", icon: "📰" },
          { value: "wellness", label: "Health & Wellness", icon: "💪" },
          { value: "philosophy", label: "Philosophy & Personal Growth", icon: "🧘" },
          { value: "global", label: "Global Affairs & Economics", icon: "🌍" },
        ],
      },
      {
        id: "fitnessActivities",
        text: "Are you into fitness or sports?",
        type: "multi-select",
        required: false,
        minSelections: 0,
        maxSelections: 5,
        options: [
          { value: "running", label: "Running/Jogging", icon: "🏃" },
          { value: "cycling", label: "Cycling", icon: "🚴" },
          { value: "yoga", label: "Yoga/Pilates", icon: "🧘" },
          { value: "crossfit", label: "CrossFit/HIIT", icon: "💪" },
          { value: "team-sports", label: "Team Sports", icon: "⚽" },
          { value: "hiking", label: "Hiking", icon: "🥾" },
          { value: "gym", label: "Gym & Strength Training", icon: "🏋️" },
          { value: "swimming", label: "Swimming", icon: "🏊" },
          { value: "martial-arts", label: "Martial Arts", icon: "🥋" },
          { value: "dance", label: "Dance", icon: "💃" },
          { value: "climbing", label: "Rock Climbing", icon: "🧗" },
          { value: "golf", label: "Golf", icon: "🏌️" },
          { value: "tennis", label: "Tennis/Racquet Sports", icon: "🎾" },
          { value: "winter-sports", label: "Winter Sports", icon: "⛷️" },
          { value: "not-active", label: "Not currently active but interested", icon: "🚫" },
        ],
      },
      {
        id: "idealWeekend",
        text: "What does your ideal weekend look like?",
        type: "icon-select",
        required: true,
        options: [
          { value: "adventure", label: "Adventure and exploring new places", icon: "🗺️" },
          { value: "relaxing", label: "Relaxing and recharging at home", icon: "🏠" },
          { value: "social", label: "Quality time with friends and family", icon: "🎉" },
          { value: "outdoors", label: "Outdoor activities and nature", icon: "🏔️" },
          { value: "projects", label: "Working on passion projects", icon: "🔨" },
          { value: "cultural", label: "Cultural events, concerts, or experiences", icon: "🎵" },
          { value: "learning", label: "Learning or personal development", icon: "📚" },
          { value: "wellness", label: "Wellness and self-care focused", icon: "🧘" },
        ],
      },
      {
        id: "volunteerCauses",
        text: "Any causes or community work you're passionate about?",
        type: "multi-select",
        required: false,
        minSelections: 0,
        maxSelections: 4,
        options: [
          { value: "environment", label: "Environmental & Sustainability", icon: "🌍" },
          { value: "education", label: "Education & Youth Development", icon: "📚" },
          { value: "entrepreneurship", label: "Entrepreneurship & Economic Development", icon: "💼" },
          { value: "social-justice", label: "Social Justice & Equity", icon: "⚖️" },
          { value: "healthcare", label: "Healthcare & Medical Research", icon: "🏥" },
          { value: "community", label: "Community Development", icon: "🏘️" },
          { value: "mentorship", label: "Mentorship & Leadership Development", icon: "🎓" },
          { value: "arts", label: "Arts & Culture", icon: "🎨" },
          { value: "children", label: "Children & Families", icon: "👶" },
          { value: "animals", label: "Animal Welfare", icon: "🐾" },
          { value: "not-active", label: "Not currently active", icon: "🌱" },
        ],
      },
      {
        id: "energizers",
        text: "What energizes you as a person?",
        type: "multi-select",
        required: true,
        minSelections: 3,
        maxSelections: 5,
        options: [
          { value: "deep-conversations", label: "Deep, meaningful conversations", icon: "🧠" },
          { value: "connecting", label: "Connecting with people and building relationships", icon: "🎉" },
          { value: "winning", label: "Overcoming challenges and winning", icon: "🏆" },
          { value: "growth", label: "Learning and personal growth", icon: "🌱" },
          { value: "helping", label: "Helping others succeed", icon: "🤝" },
          { value: "creating", label: "Creating and building something new", icon: "🎨" },
          { value: "solitude", label: "Reflection and solitude", icon: "🧘" },
          { value: "high-energy", label: "High-energy, fast-paced environments", icon: "⚡" },
          { value: "new-experiences", label: "New experiences and perspectives", icon: "🌍" },
        ],
      },
    ],
  },

  // ============================================
  // SECTION 4: Your Leadership Style
  // ============================================
  {
    id: "leadership-style",
    title: "Your Leadership Style",
    subtitle: "Final section! This helps us find your leadership tribe",
    icon: "🤝",
    questions: [
      {
        id: "leadershipPhilosophy",
        text: "How would you describe your leadership philosophy?",
        type: "multi-select",
        required: true,
        minSelections: 3,
        maxSelections: 5,
        options: [
          { value: "servant", label: "Servant leadership - I serve my team", icon: "🤝" },
          { value: "results", label: "Results-driven - focused on outcomes", icon: "🎯" },
          { value: "people-first", label: "People-first - relationships matter most", icon: "👥" },
          { value: "visionary", label: "Visionary - painting the future", icon: "💡" },
          { value: "coach", label: "Coach and developer - growing others", icon: "🎓" },
          { value: "data-informed", label: "Data-informed - metrics guide decisions", icon: "📊" },
          { value: "entrepreneurial", label: "Entrepreneurial - taking calculated risks", icon: "🚀" },
          { value: "collaborative", label: "Collaborative - we win together", icon: "🤲" },
          { value: "authentic", label: "Authentic - leading with vulnerability", icon: "🎭" },
          { value: "decisive", label: "Decisive - moving fast and adapting", icon: "⚡" },
        ],
      },
      {
        id: "decisionMakingStyle",
        text: "What's your decision-making style?",
        type: "single-select",
        required: true,
        options: [
          { value: "thoughtful", label: "Thoughtful - I need time to analyze", icon: "💭" },
          { value: "decisive", label: "Decisive - I trust my gut and move quickly", icon: "⚡" },
          { value: "collaborative", label: "Collaborative - I gather input from the team", icon: "🤝" },
          { value: "data-driven", label: "Data-driven - show me the numbers", icon: "📊" },
          { value: "adaptive", label: "Adaptive - it depends on the situation", icon: "🔄" },
          { value: "strategic", label: "Strategic - I think long-term first", icon: "🎯" },
        ],
      },
      {
        id: "failureApproach",
        text: "How do you approach failure and setbacks?",
        type: "single-select",
        required: true,
        options: [
          { value: "learning", label: "Learning opportunity - what can we extract?", icon: "📚" },
          { value: "pivot", label: "Move fast and pivot quickly", icon: "⚡" },
          { value: "team-reflection", label: "Team reflection - we process together", icon: "🤝" },
          { value: "analyze", label: "Analyze deeply to prevent recurrence", icon: "🎯" },
          { value: "resilient", label: "Resilient - shake it off and keep going", icon: "💪" },
          { value: "philosophical", label: "Philosophical - it's part of the journey", icon: "🧘" },
        ],
      },
      {
        id: "relationshipValues",
        text: "What do you value most in professional relationships?",
        type: "rank",
        required: true,
        minSelections: 3,
        maxSelections: 3,
        options: [
          { value: "authenticity", label: "Authenticity - being real and vulnerable", icon: "💯" },
          { value: "expertise", label: "Expertise - learning from the best", icon: "🧠" },
          { value: "mutual-benefit", label: "Mutual benefit - helping each other succeed", icon: "🤝" },
          { value: "trust", label: "Trust - knowing they have my back", icon: "🎭" },
          { value: "reliability", label: "Reliability - following through", icon: "⏰" },
          { value: "innovation", label: "Innovation - pushing each other to think bigger", icon: "💡" },
          { value: "diversity", label: "Diverse perspectives - challenging my assumptions", icon: "🌈" },
          { value: "shared-values", label: "Shared values - aligned on what matters", icon: "❤️" },
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
        id: "leadershipSeason",
        text: "What's your current leadership season?",
        type: "single-select",
        required: false,
        options: [
          { value: "building", label: "Building mode - starting something new", icon: "🚀" },
          { value: "scaling", label: "Scaling mode - growing fast", icon: "📈" },
          { value: "transformation", label: "Transformation mode - major change initiative", icon: "🔄" },
          { value: "optimization", label: "Optimization mode - refining what works", icon: "⚖️" },
          { value: "exploration", label: "Exploration mode - figuring out what's next", icon: "🧭" },
          { value: "development", label: "Development mode - focused on my own growth", icon: "🌱" },
          { value: "survival", label: "Survival mode - navigating challenges", icon: "🔥" },
          { value: "steady", label: "Steady state - maintaining momentum", icon: "🎯" },
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

