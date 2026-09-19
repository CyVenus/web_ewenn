import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlurText } from './BlurText';

describe('BlurText component', () => {
  it('renders all words of the text', () => {
    const { container } = render(<BlurText text="Hello beautiful world" />);
    expect(container).toHaveTextContent('Hello beautiful world');
  });

  it('applies staggered animation delays to words', () => {
    const { container } = render(<BlurText text="One two three" delay={100} stepDuration={50} />);
    const words = container.querySelectorAll('.blur-text-word');
    expect(words).toHaveLength(3);
    expect(words[0]).toHaveStyle({ animationDelay: '100ms' });
    expect(words[1]).toHaveStyle({ animationDelay: '150ms' });
    expect(words[2]).toHaveStyle({ animationDelay: '200ms' });
  });

  it('wraps specified phrase inside phraseClassName element', () => {
    const { container } = render(
      <BlurText
        text="Your new self-care partner."
        phrase="self-care partner."
        phraseClassName="custom-phrase"
      />,
    );
    const phraseEl = container.querySelector('.custom-phrase');
    expect(phraseEl).toBeInTheDocument();
    expect(phraseEl).toHaveTextContent('self-care partner.');
    expect(container).toHaveTextContent('Your new self-care partner.');
  });

  it('supports top direction modifier', () => {
    const { container } = render(<BlurText text="Test" direction="top" />);
    const word = container.querySelector('.blur-text-word');
    expect(word).toHaveClass('blur-text-word--top');
  });
});
