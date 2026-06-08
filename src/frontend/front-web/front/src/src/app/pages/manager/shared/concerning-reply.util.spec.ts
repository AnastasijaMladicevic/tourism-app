import {
  detectConcerningReplyKind,
  getConcerningReportCategory,
  isConcerningCreatorReply,
  isSevereConcerningReply,
} from './concerning-reply.util';

describe('concerning-reply.util', () => {
  it('flags English self-harm encouragement', () => {
    expect(isConcerningCreatorReply({ creatorResponse: 'Kill yourself' })).toBe(true);
    expect(detectConcerningReplyKind({ creatorResponse: 'Hang yourself' })).toBe(
      'self_harm_encouragement',
    );
    expect(getConcerningReportCategory(detectConcerningReplyKind({ creatorResponse: 'kys' }))).toBe(
      'inappropriate_content',
    );
  });

  it('flags spaced or obfuscated harmful phrases', () => {
    expect(isConcerningCreatorReply({ creatorResponse: 'K i l l   y o u r s e l f' })).toBe(true);
    expect(isConcerningCreatorReply({ creatorResponse: 'hang urself idiot' })).toBe(true);
  });

  it('flags Serbian self-harm encouragement', () => {
    expect(detectConcerningReplyKind({ creatorResponse: 'Ubij se.' })).toBe(
      'self_harm_encouragement',
    );
    expect(detectConcerningReplyKind({ creatorResponse: 'Objesi se!' })).toBe(
      'self_harm_encouragement',
    );
  });

  it('maps profanity to unprofessional conduct', () => {
    expect(detectConcerningReplyKind({ creatorResponse: 'fuck off' })).toBe('profanity_insult');
    expect(getConcerningReportCategory('profanity_insult')).toBe('unprofessional_conduct');
  });

  it('prioritizes self-harm over profanity when both are present', () => {
    expect(detectConcerningReplyKind({ creatorResponse: 'fuck you, kill yourself' })).toBe(
      'self_harm_encouragement',
    );
  });

  it('treats severe kinds as severe', () => {
    expect(isSevereConcerningReply('self_harm_encouragement')).toBe(true);
    expect(isSevereConcerningReply('profanity_insult')).toBe(false);
  });

  it('ignores empty or professional replies', () => {
    expect(isConcerningCreatorReply({ creatorResponse: '' })).toBe(false);
    expect(
      isConcerningCreatorReply({
        creatorResponse: 'Thank you for your feedback. We are working on improvements.',
      }),
    ).toBe(false);
  });
});
