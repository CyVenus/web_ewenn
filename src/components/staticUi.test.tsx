import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COPY, HEADLINE } from '../config';
import { Hero } from './Hero';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

describe('Hero copy', () => {
  it('renders the headline verbatim, as one continuous string', () => {
    render(<Hero />);
    // Split across a span for the wrap; the reader and the clipboard must still see it whole.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(COPY.headline);
  });

  it('renders the subline verbatim', () => {
    render(<Hero />);
    expect(screen.getByText(COPY.subline)).toBeInTheDocument();
  });

  it('has exactly one h1', () => {
    render(<Hero />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  /**
   * The tail of the headline is wrapped so a wrap can never split a hyphenated word across lines
   * (see config.ts). It is markup, not styling, so it survives a CSS regression — and whatever
   * the headline says, the two halves must still reconstruct it exactly.
   */
  it('keeps the protected phrase in its own span', () => {
    const { container } = render(<Hero />);
    const phrase = container.querySelector('.hero__title-phrase');
    expect(phrase).toBeInTheDocument();
    expect(phrase).toHaveTextContent(HEADLINE.phrase);
    expect(HEADLINE.lead + HEADLINE.phrase).toBe(COPY.headline);
  });

  it('labels the hero section by its own heading', () => {
    const { container } = render(<Hero />);
    const section = container.querySelector('section.hero');
    expect(section).toHaveAttribute('aria-labelledby', 'hero-title');
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'hero-title');
  });
});

describe('SiteHeader', () => {
  it('shows the name beside the icon', () => {
    render(<SiteHeader />);
    expect(screen.getByText(COPY.name)).toBeInTheDocument();
  });

  it('marks the icon decorative, so the name is not announced twice', () => {
    const { container } = render(<SiteHeader />);
    expect(container.querySelector('img.brand__icon')).toHaveAttribute('alt', '');
  });

  it('links the brand home', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });
});

describe('SiteFooter', () => {
  it('links to all three documents at their directory URLs', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy/');
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms/');
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support/');
  });

  /** Playback follows prefers-reduced-motion alone; a toggle would be a second source of truth. */
  it('carries no controls at all', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('names the legal nav for screen readers', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('navigation', { name: 'Legal' })).toBeInTheDocument();
  });
});
