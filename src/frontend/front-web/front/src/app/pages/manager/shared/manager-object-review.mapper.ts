import { ReviewDto } from '../../../services/review';
import { ManagerObjectReviewThread } from './manager-object-review.mock';

function initialsFromFullName(fullName?: string | null): string {
  const parts = (fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Maps API reviews for a single object into manager sidebar / review thread shape. */
export function mapReviewDtosToObjectThreads(
  reviews: ReviewDto[],
  creatorId: number,
  creatorName: string,
): ManagerObjectReviewThread[] {
  return [...reviews]
    .map((review) => ({
      id: review.id,
      touristName: review.userFullName?.trim() || 'Tourist',
      touristInitials: initialsFromFullName(review.userFullName),
      rating: review.rating,
      touristReview: review.text?.trim() || '—',
      createdAt: review.createdAt,
      creatorResponse: review.creatorResponse ?? null,
      creatorResponseAt: review.creatorResponseAt ?? null,
      creatorId: creatorId || 0,
      creatorName: creatorName.trim() || 'Content Creator',
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}
