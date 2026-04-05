export type NetworkPulsePollPayload = {
  pollId: string;
  counts: Record<string, number>;
  total: number;
  percentages: Record<string, number>;
  majorityOptionId: string;
  majorityLabel: string;
  userVote: string | null;
};
