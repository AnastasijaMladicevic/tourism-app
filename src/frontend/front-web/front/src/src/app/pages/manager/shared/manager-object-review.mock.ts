import { isConcerningCreatorReply as isConcerningCreatorReplyFromUtil } from './concerning-reply.util';

/** Design-time mock data for tourist reviews on manager object views. */

export interface ManagerObjectReviewThread {
  id: number;
  touristName: string;
  touristInitials: string;
  rating: number;
  touristReview: string;
  createdAt: string;
  creatorResponse?: string | null;
  creatorResponseAt?: string | null;
  creatorId: number;
  creatorName: string;
}

const DEFAULT_THREADS: ManagerObjectReviewThread[] = [
  {
    id: 9001,
    touristName: 'Elena Horvat',
    touristInitials: 'EH',
    rating: 2,
    touristReview:
      'Room was fine but staff seemed dismissive when we asked about parking. Expected clearer info on the listing.',
    createdAt: '2026-05-12T16:40:00Z',
    creatorResponse:
      'Maybe you should read the listing next time instead of complaining. Not our problem if tourists cannot follow basic instructions.',
    creatorResponseAt: '2026-05-12T18:05:00Z',
    creatorId: 201,
    creatorName: 'Marko Petrović',
  },
  {
    id: 9002,
    touristName: 'James Miller',
    touristInitials: 'JM',
    rating: 4,
    touristReview: 'Great location and clean rooms. Would visit again.',
    createdAt: '2026-05-10T11:20:00Z',
    creatorResponse:
      'Thank you for your kind words, James. We are glad you enjoyed the stay and hope to welcome you again.',
    creatorResponseAt: '2026-05-10T14:00:00Z',
    creatorId: 201,
    creatorName: 'Marko Petrović',
  },
  {
    id: 9003,
    touristName: 'Anna Berg',
    touristInitials: 'AB',
    rating: 1,
    touristReview: 'Misleading photos — pool area was under renovation and not mentioned anywhere.',
    createdAt: '2026-05-05T09:00:00Z',
    creatorResponse: null,
    creatorResponseAt: null,
    creatorId: 201,
    creatorName: 'Marko Petrović',
  },
];

const BY_OBJECT_ID: Record<number, ManagerObjectReviewThread[]> = {
  88: DEFAULT_THREADS,
};

export function getMockObjectReviewThreads(
  objectId: number,
  creatorName = '',
  creatorId = 201,
): ManagerObjectReviewThread[] {
  const base = BY_OBJECT_ID[objectId] ?? DEFAULT_THREADS;
  return base.map((t) => ({
    ...t,
    creatorName: t.creatorName || creatorName,
    creatorId: t.creatorId || creatorId,
  }));
}

export function isConcerningCreatorReply(thread: ManagerObjectReviewThread): boolean {
  return isConcerningCreatorReplyFromUtil({
    creatorResponse: thread.creatorResponse,
    touristRating: thread.rating,
  });
}
