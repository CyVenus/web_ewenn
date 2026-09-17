import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Both launch states matter, and only one of them is ever visible at a time, so the config is
 * mocked through getters: each test sets the ID and re-imports the module graph.
 */
const store = { id: '' };

vi.mock('../config', async () => {
  const actual = await vi.importActual<typeof import('../config')>('../config');
  return {
    ...actual,
    get APP_STORE_ID() {
      return store.id;
    },
    get APP_STORE_LIVE() {
      return /^\d+$/.test(store.id);
    },
    get APP_STORE_URL() {
      return `https://apps.apple.com/app/id${store.id}`;
    },
  };
});

async function renderBadge(id: string) {
  store.id = id;
  vi.resetModules();
  const { AppStoreBadge } = await import('./AppStoreBadge');
  return render(<AppStoreBadge />);
}

afterEach(() => {
  store.id = '';
});

describe('AppStoreBadge before the app is listed', () => {
  it('still renders Apple official artwork, not a substitute of our own', async () => {
    const { container } = await renderBadge('');
    const img = container.querySelector('img.store-badge__img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('app-store-badge'));
  });

  it('is not a link, because there is nowhere legitimate to send anyone yet', async () => {
    const { container } = await renderBadge('');
    expect(container.querySelector('a')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('carries its own accessible name so the artwork is not silent', async () => {
    await renderBadge('');
    expect(screen.getByRole('img', { name: 'Ewenn is coming soon to the App Store' })).toBeInTheDocument();
  });

  it('does not dim, tint or otherwise alter the artwork to signal "not yet"', async () => {
    const { container } = await renderBadge('');
    const img = container.querySelector('img.store-badge__img') as HTMLElement;
    expect(img.style.filter).toBe('');
    expect(img.style.opacity).toBe('');
    expect(img.className).toBe('store-badge__img');
  });
});

describe('AppStoreBadge once the App Store ID is set', () => {
  it('becomes a real link to that ID, with no other edit', async () => {
    await renderBadge('1234567890');
    const link = screen.getByRole('link', { name: 'Download Ewenn on the App Store' });
    expect(link).toHaveAttribute('href', 'https://apps.apple.com/app/id1234567890');
  });

  it('opens in the same tab, as Apple expects', async () => {
    await renderBadge('1234567890');
    expect(screen.getByRole('link')).not.toHaveAttribute('target');
  });

  it('renders the identical artwork it did before launch', async () => {
    const { container } = await renderBadge('1234567890');
    expect(container.querySelector('img.store-badge__img')).toBeInTheDocument();
  });

  it('stays a plain image for a non-numeric ID rather than linking somewhere broken', async () => {
    await renderBadge('TODO');
    expect(screen.queryByRole('link')).toBeNull();
  });
});
