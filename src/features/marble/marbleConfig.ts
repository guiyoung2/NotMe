export const MAX_MARBLES = 100;

export type RandomSource = () => number;

export type MarbleParticipant = {
  id: string;
  name: string;
  count: number;
};

export type MarbleSeed = {
  id: string;
  participantId: string;
  name: string;
};

export type MarbleValidation =
  | { valid: true; total: number }
  | { valid: false; total: number; overBy: number };

export function validateMarbleParticipants(
  participants: readonly MarbleParticipant[],
): MarbleValidation {
  const total = participants.reduce((sum, participant) => sum + participant.count, 0);
  const hasValidParticipants = participants.length >= 2
    && participants.every((participant) => (
      participant.name.trim().length > 0
      && Number.isInteger(participant.count)
      && participant.count >= 1
      && participant.count <= MAX_MARBLES
    ));
  const hasValidTotal = total >= 2 && total <= MAX_MARBLES;

  if (!hasValidParticipants || !hasValidTotal) {
    return { valid: false, total, overBy: Math.max(0, total - MAX_MARBLES) };
  }

  return { valid: true, total };
}

export function expandMarbles(participants: readonly MarbleParticipant[]): MarbleSeed[] {
  return participants.flatMap((participant) => (
    Array.from({ length: participant.count }, (_, index) => ({
      id: `${participant.id}:${index}`,
      participantId: participant.id,
      name: participant.name,
    }))
  ));
}

export function shuffleMarbles(
  marbles: readonly MarbleSeed[],
  random: RandomSource,
): MarbleSeed[] {
  const shuffled = [...marbles];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}
