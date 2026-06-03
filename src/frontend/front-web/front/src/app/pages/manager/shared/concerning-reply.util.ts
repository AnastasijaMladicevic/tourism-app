export interface ConcerningReplyContext {
  creatorResponse?: string | null;
  touristRating?: number;
}

/** English + Serbian/Croatian/Bosnian phrases indicating unprofessional or abusive replies. */
const CONCERNING_PHRASES = [
  // English — dismissive / hostile
  'not our problem',
  'your fault',
  'read the listing',
  'cannot follow',
  'complaining',
  'deal with it',
  'grow up',
  'shut up',
  'stupid tourist',
  'idiot',
  'moron',
  'go away',
  'never come back',
  // English — profanity (common)
  'fuck you',
  'fuck off',
  'bitch',
  'asshole',
  'bastard',
  // Serbian / Croatian / Bosnian — profanity & insults
  'pusi kurac',
  'pusi kur',
  'jebi se',
  'jebem ti',
  'jebem te',
  'idiote',
  'budalo',
  'retardu',
  'picka',
  'pička',
  'kurac',
  'kurcu',
  'govno',
  'sranje',
  'smrdi',
  'ubij se',
  'mrzi',
  'glup',
  'glupa',
  'debil',
  'kreten',
  'svinjo',
  'prostak',
  'nisi normal',
  'nisi normalan',
  'nije nas problem',
  'nije nas posao',
  'tvoja krivica',
  'sami krivi',
  'citaj oglas',
  'procitaj oglas',
  'zalite se',
  'ne znam citati',
];

const CATEGORY_LABELS: Record<string, string> = {
  inappropriate_content: 'Inappropriate or misleading content',
  repeated_violations: 'Repeated policy violations',
  unprofessional_conduct: 'Unprofessional conduct (review reply)',
  spam_abuse: 'Spam or platform abuse',
  other: 'Other',
};

/**
 * Normalizes reply text for phrase matching (lowercase, strip diacritics, collapse separators).
 */
export function normalizeReplyTextForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Compact form to catch spaced obfuscation e.g. "p u s i   k u r a c". */
export function compactReplyTextForMatch(text: string): string {
  return normalizeReplyTextForMatch(text).replace(/\s+/g, '');
}

export function isConcerningCreatorReply(context: ConcerningReplyContext): boolean {
  const raw = context.creatorResponse?.trim();
  if (!raw) {
    return false;
  }

  const normalized = normalizeReplyTextForMatch(raw);
  const compact = compactReplyTextForMatch(raw);

  if (!normalized) {
    return false;
  }

  return CONCERNING_PHRASES.some((phrase) => {
    const phraseNorm = normalizeReplyTextForMatch(phrase);
    const phraseCompact = phraseNorm.replace(/\s+/g, '');
    return (
      normalized.includes(phraseNorm) ||
      compact.includes(phraseCompact) ||
      normalized.includes(phraseCompact)
    );
  });
}

export interface ReviewReportReasonInput {
  reviewId: number;
  objectName: string;
  touristName: string;
  touristRating: number;
  creatorName: string;
  creatorResponse: string;
  category?: string;
  autoDetected?: boolean;
}

interface ReviewReportReasonLabels {
  categoryPrefix: string;
  autoDetected: string;
  managerModeration: string;
  reviewLabel: string;
  touristLabel: string;
  creatorLabel: string;
  replyLabel: string;
  categoryLabels?: Record<string, string>;
}

export function buildReviewReportReason(
  input: ReviewReportReasonInput,
  labels?: ReviewReportReasonLabels,
): string {
  const categoryKey = input.category?.trim() || 'unprofessional_conduct';
  const categoryLabel = labels?.categoryLabels?.[categoryKey] ?? CATEGORY_LABELS[categoryKey] ?? categoryKey;
  const detectionNote = input.autoDetected
    ? labels?.autoDetected ?? 'Flagged automatically as a concerning reply (language / conduct rules).'
    : labels?.managerModeration ?? 'Reported from manager review moderation.';

  const lines = [
    `${labels?.categoryPrefix ?? 'Category'}: ${categoryLabel}`,
    detectionNote,
    `${labels?.reviewLabel ?? 'Review'} #${input.reviewId} — ${input.objectName}`,
    `${labels?.touristLabel ?? 'Tourist'}: ${input.touristName} (${input.touristRating}/5)`,
    `${labels?.creatorLabel ?? 'Content creator'}: ${input.creatorName}`,
    `${labels?.replyLabel ?? 'Reply'}: "${input.creatorResponse.trim().slice(0, 400)}"`,
  ];

  return lines.join('\n').slice(0, 500);
}

export function formatReportCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export const REPORT_CATEGORY_OPTIONS = [
  { value: '', label: 'Select a category (optional)' },
  { value: 'inappropriate_content', label: 'Inappropriate or misleading content' },
  { value: 'repeated_violations', label: 'Repeated policy violations' },
  { value: 'unprofessional_conduct', label: 'Unprofessional conduct (review reply)' },
  { value: 'spam_abuse', label: 'Spam or platform abuse' },
  { value: 'other', label: 'Other (describe below)' },
] as const;
