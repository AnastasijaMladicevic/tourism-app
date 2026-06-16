export interface ConcerningReplyContext {
  creatorResponse?: string | null;
  touristRating?: number;
}

export type ConcerningReplyKind =
  | 'self_harm_encouragement'
  | 'violence_threat'
  | 'hate_discrimination'
  | 'sexual_harassment'
  | 'harassment'
  | 'spam_scam'
  | 'profanity_insult'
  | 'dismissive_hostile';

type PhraseRule = {
  kind: ConcerningReplyKind;
  phrases: string[];
};

type RegexRule = {
  kind: ConcerningReplyKind;
  pattern: RegExp;
};

/** Most severe kinds win when multiple rules match. */
const KIND_PRIORITY: ConcerningReplyKind[] = [
  'self_harm_encouragement',
  'violence_threat',
  'hate_discrimination',
  'sexual_harassment',
  'harassment',
  'spam_scam',
  'profanity_insult',
  'dismissive_hostile',
];

const REPORT_CATEGORY_BY_KIND: Record<ConcerningReplyKind, string> = {
  self_harm_encouragement: 'inappropriate_content',
  violence_threat: 'inappropriate_content',
  hate_discrimination: 'inappropriate_content',
  sexual_harassment: 'inappropriate_content',
  harassment: 'inappropriate_content',
  spam_scam: 'spam_abuse',
  profanity_insult: 'unprofessional_conduct',
  dismissive_hostile: 'unprofessional_conduct',
};

const PHRASE_RULES: PhraseRule[] = [
  {
    kind: 'self_harm_encouragement',
    phrases: [
      'kill yourself',
      'kill urself',
      'kill ur self',
      'kys',
      'hang yourself',
      'hang urself',
      'hang ur self',
      'neck yourself',
      'go die',
      'go kill yourself',
      'you should die',
      'you should kill yourself',
      'drop dead',
      'die already',
      'hope you die',
      'wish you were dead',
      'wish you dead',
      'end yourself',
      'end your life',
      'slit your wrists',
      'slit wrists',
      'nobody wants you',
      'no one wants you',
      'better off dead',
      'do everyone a favor and die',
      'ubij se',
      'ubij sebe',
      'objesi se',
      'objesi',
      'obesi se',
      'visi se',
      'skoči',
      'skoci',
      'umri',
      'umri vec',
      'najbolje da umres',
      'bolje da umres',
      'nema te nikome',
      'nikom nisi potreban',
      'nikom nisi potrebna',
      'ammazzati',
      'vai a morire',
      'vai ad ammazzarti',
      'spero che tu muoia',
      'meglio se muori',
      'uccidi te stesso',
      'uccidetevi',
      'impiccati',
      'vai a impiccarti',
      'nessuno ti vuole',
      'saresti meglio morto',
      'mátate',
      'matate',
      'vete a morir',
      'ojalá te mueras',
      'ojala te mueras',
      'mejor muerto',
      'suicídate',
      'suicidate',
      'cuélgate',
      'cuelgate',
      'nadie te quiere',
      'estarías mejor muerto',
      'estarias mejor muerto',
    ],
  },
  {
    kind: 'violence_threat',
    phrases: [
      'i will kill you',
      'ill kill you',
      "i'll kill you",
      'gonna kill you',
      'going to kill you',
      'watch your back',
      'youll regret',
      "you'll regret",
      'i know where you live',
      'know where you live',
      'see you in court',
      'gonna hurt you',
      'going to hurt you',
      'beat you up',
      'ubicu te',
      'ubi cu te',
      'nadjem te',
      'naci cu te',
      'naći ću te',
      'prebit cu te',
      'prebiću te',
      'sacekaj me',
      'sačekaj me',
      'ti uccido',
      'ti ammazzo',
      'ti pestiamo',
      'ti aspettiamo fuori',
      'ti troviamo',
      'ti faremo del male',
      'te voy a matar',
      'te mato',
      'te vamos a encontrar',
      'te haremos daño',
      'te haremos dano',
      'te estamos esperando',
    ],
  },
  {
    kind: 'hate_discrimination',
    phrases: [
      'go back to your country',
      'go back where you came from',
      'go back home',
      'your kind',
      'you people always',
      'typical tourist',
      'dirty tourist',
      'we dont want your kind',
      'vrati se u svoju zemlju',
      'vrati se odakle si dosao',
      'vrati se odakle si došao',
      'tvoja sorta',
      'takvi kao ti',
      'prljavi turisti',
      'torna nel tuo paese',
      'torna a casa tua',
      'turisti sporchi',
      'tipico turista',
      'vuelve a tu país',
      'vuelve a tu pais',
      'vuelve a tu casa',
      'turistas sucios',
      'típico turista',
    ],
  },
  {
    kind: 'sexual_harassment',
    phrases: [
      'send nudes',
      'show me your',
      'what are you wearing',
      'come to my room',
      'sleep with me',
      'pošalji slike',
      'posalji slike',
      'goliju se',
      'goliju',
      'mandami foto nude',
      'mostrami il tuo',
      'vieni in camera mia',
      'dormi con me',
      'cosa indossi',
      'manda fotos desnuda',
      'muéstrame tu',
      'muestrame tu',
      'ven a mi habitación',
      'ven a mi habitacion',
      'duerme conmigo',
      'qué llevas puesto',
      'que llevas puesto',
    ],
  },
  {
    kind: 'harassment',
    phrases: [
      'stalker',
      'stop harassing',
      'leave us alone or',
      'dont come back',
      "don't come back",
      'we will ban you',
      'reporting you to police',
      'dox you',
      'doxx you',
      'creep',
      'pervert',
      'loser',
      'pathetic',
      'worthless',
      'disgusting person',
      'nenormalan si',
      'nenormalna si',
      'nisi normal',
      'nisi normalan',
      'gnjida',
      'odvratan',
      'odvratna',
      'pervertito',
      'patetico',
      'smettila di tormentarci',
      'non tornare più',
      'non tornare piu',
      'ti denunciamo',
      'persona disgustosa',
      'pervertido',
      'patético',
      'deja de acosarnos',
      'no vuelvas más',
      'no vuelvas mas',
      'te denunciaremos',
      'persona repugnante',
      'acosador',
    ],
  },
  {
    kind: 'spam_scam',
    phrases: [
      'whatsapp me',
      'contact me on whatsapp',
      'send me your card',
      'bank details',
      'click this link',
      'free refund',
      'telegram me',
      'viber me',
      'posalji mi karticu',
      'pošalji mi karticu',
      'broj kartice',
      'scrivimi su whatsapp',
      'contattami su telegram',
      'manda i dati della carta',
      'clicca questo link',
      'rimborso gratuito',
      'escríbeme por whatsapp',
      'escribeme por whatsapp',
      'contáctame por telegram',
      'contactame por telegram',
      'envía los datos de tu tarjeta',
      'envia los datos de tu tarjeta',
      'haz clic en este enlace',
      'reembolso gratis',
    ],
  },
  {
    kind: 'profanity_insult',
    phrases: [
      'fuck you',
      'fuck off',
      'bitch',
      'asshole',
      'bastard',
      'dickhead',
      'cunt',
      'motherfucker',
      'shithead',
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
      'kreten',
      'svinjo',
      'prostak',
      'glup',
      'glupa',
      'stupid tourist',
      'idiot',
      'moron',
      'vai a farti fottere',
      'stronzo',
      'stronza',
      'bastardo',
      'testa di cazzo',
      'stupido',
      'stupida',
      'scemo',
      'scema',
      'cretino',
      'cretina',
      'merda',
      'turista stupido',
      'que te jodan',
      'vete a la mierda',
      'cabrón',
      'cabron',
      'cabrona',
      'imbécil',
      'imbecil',
      'estúpido',
      'estupido',
      'estúpida',
      'estupida',
      'gilipollas',
      'mierda',
      'turista estúpido',
      'turista estupido',
    ],
  },
  {
    kind: 'dismissive_hostile',
    phrases: [
      'not our problem',
      'your fault',
      'read the listing',
      'cannot follow',
      'complaining',
      'deal with it',
      'grow up',
      'shut up',
      'go away',
      'never come back',
      'nije nas problem',
      'nije nas posao',
      'tvoja krivica',
      'sami krivi',
      'citaj oglas',
      'procitaj oglas',
      'zalite se',
      'ne znam citati',
      'mrzi',
      'non è il nostro problema',
      'non e il nostro problema',
      'colpa tua',
      'leggi l\'annuncio',
      'leggi l annuncio',
      'stai zitto',
      'stai zitta',
      'vattene',
      'non tornare mai più',
      'non tornare mai piu',
      'no es nuestro problema',
      'es tu culpa',
      'lee el anuncio',
      'cállate',
      'callate',
      'vete de aquí',
      'vete de aqui',
      'no vuelvas nunca más',
      'no vuelvas nunca mas',
    ],
  },
];

const REGEX_RULES: RegexRule[] = [
  { kind: 'self_harm_encouragement', pattern: /\bkill\s*(your|ur|u)\s*self\b/ },
  { kind: 'self_harm_encouragement', pattern: /\bhang\s*(your|ur|u)\s*self\b/ },
  { kind: 'self_harm_encouragement', pattern: /\bk\s*y\s*s\b/ },
  { kind: 'self_harm_encouragement', pattern: /\bgo\s+die\b/ },
  { kind: 'self_harm_encouragement', pattern: /\b(hope|wish)\s+you\s+(die|dead)\b/ },
  { kind: 'self_harm_encouragement', pattern: /\bend\s+(your|ur)\s*life\b/ },
  { kind: 'self_harm_encouragement', pattern: /\bubij\s*se\b/ },
  { kind: 'self_harm_encouragement', pattern: /\bobjesi(\s+se)?\b/ },
  { kind: 'self_harm_encouragement', pattern: /\bvisi\s+se\b/ },
  { kind: 'violence_threat', pattern: /\b(i|ill|i'll)\s*(will|ll)?\s*kill\s+you\b/ },
  { kind: 'violence_threat', pattern: /\b(gonna|going)\s+to\s+kill\s+you\b/ },
  { kind: 'hate_discrimination', pattern: /\bgo\s+back\s+to\s+(your|ur)\s+country\b/ },
  { kind: 'spam_scam', pattern: /\b(send|share)\s+(me\s+)?(your\s+)?(card|bank)\b/ },
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

function collectMatchingKinds(normalized: string, compact: string): Set<ConcerningReplyKind> {
  const matches = new Set<ConcerningReplyKind>();

  for (const rule of PHRASE_RULES) {
    for (const phrase of rule.phrases) {
      const phraseNorm = normalizeReplyTextForMatch(phrase);
      const phraseCompact = phraseNorm.replace(/\s+/g, '');
      if (
        normalized.includes(phraseNorm) ||
        compact.includes(phraseCompact) ||
        normalized.includes(phraseCompact)
      ) {
        matches.add(rule.kind);
        break;
      }
    }
  }

  for (const rule of REGEX_RULES) {
    if (rule.pattern.test(normalized) || rule.pattern.test(compact)) {
      matches.add(rule.kind);
    }
  }

  return matches;
}

function pickHighestPriorityKind(matches: Set<ConcerningReplyKind>): ConcerningReplyKind | null {
  for (const kind of KIND_PRIORITY) {
    if (matches.has(kind)) {
      return kind;
    }
  }
  return null;
}

export function detectConcerningTextKind(text?: string | null): ConcerningReplyKind | null {
  const raw = text?.trim();
  if (!raw) {
    return null;
  }

  const normalized = normalizeReplyTextForMatch(raw);
  const compact = compactReplyTextForMatch(raw);
  if (!normalized) {
    return null;
  }

  const matches = collectMatchingKinds(normalized, compact);
  return pickHighestPriorityKind(matches);
}

export function detectConcerningReplyKind(context: ConcerningReplyContext): ConcerningReplyKind | null {
  return detectConcerningTextKind(context.creatorResponse);
}

export function isConcerningCreatorReply(context: ConcerningReplyContext): boolean {
  return detectConcerningReplyKind(context) != null;
}

export function isConcerningText(text?: string | null): boolean {
  return detectConcerningTextKind(text) != null;
}

export function getConcerningReportCategory(kind: ConcerningReplyKind | null): string {
  if (!kind) {
    return 'other';
  }
  return REPORT_CATEGORY_BY_KIND[kind];
}

export function isSevereConcerningReply(kind: ConcerningReplyKind | null): boolean {
  return (
    kind === 'self_harm_encouragement' ||
    kind === 'violence_threat' ||
    kind === 'hate_discrimination' ||
    kind === 'sexual_harassment'
  );
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
