import type { CSSProperties, ReactElement } from 'react';

export type BlurTextProps = {
  /** The full text to animate. */
  text: string;
  /** Initial delay before the animation starts in milliseconds. Defaults to 100ms. */
  delay?: number;
  /** Stagger step duration between words in milliseconds. Defaults to 80ms. */
  stepDuration?: number;
  /** Additional CSS class for the container. */
  className?: string;
  /** Slide direction: 'bottom' (default) slides up into view; 'top' slides down. */
  direction?: 'top' | 'bottom';
  /** Optional substring within text to wrap inside a dedicated container element. */
  phrase?: string;
  /** CSS class name applied to the phrase wrapper. */
  phraseClassName?: string;
};

/**
 * BlurText entry animation adapted from React Bits (https://reactbits.dev/text-animations/blur-text).
 * Animates text with a smooth blur-to-crisp focus, staggered translation, and scale reveal.
 */
export function BlurText({
  text,
  delay = 100,
  stepDuration = 80,
  className = '',
  direction = 'bottom',
  phrase,
  phraseClassName,
}: BlurTextProps): ReactElement {
  const allWords = text.trim().split(/\s+/);
  const phraseWords = phrase ? phrase.trim().split(/\s+/) : [];

  let leadWords: string[] = allWords;
  let wrappedPhraseWords: string[] = [];

  if (phraseWords.length > 0) {
    const phraseStartIndex = allWords.findIndex((_, i) =>
      phraseWords.every((pw, pi) => allWords[i + pi] === pw),
    );

    if (phraseStartIndex !== -1) {
      leadWords = allWords.slice(0, phraseStartIndex);
      wrappedPhraseWords = allWords.slice(phraseStartIndex, phraseStartIndex + phraseWords.length);
    }
  }

  let globalIndex = 0;

  const renderWord = (word: string, isLastInBlock: boolean) => {
    const index = globalIndex++;
    const animStyle: CSSProperties = {
      animationDelay: `${delay + index * stepDuration}ms`,
    };

    return (
      <span key={`${word}-${index}`} className="blur-text-token">
        <span
          className={`blur-text-word ${direction === 'top' ? 'blur-text-word--top' : ''}`}
          style={animStyle}
        >
          {word}
        </span>
        {!isLastInBlock && ' '}
      </span>
    );
  };

  return (
    <span className={`blur-text ${className}`.trim()}>
      {leadWords.map((word, i) =>
        renderWord(word, i === leadWords.length - 1 && wrappedPhraseWords.length === 0),
      )}
      {leadWords.length > 0 && wrappedPhraseWords.length > 0 && ' '}
      {wrappedPhraseWords.length > 0 && (
        <span className={phraseClassName}>
          {wrappedPhraseWords.map((word, i) =>
            renderWord(word, i === wrappedPhraseWords.length - 1),
          )}
        </span>
      )}
    </span>
  );
}
