import { render } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import BreadcrumbJsonLd from './BreadcrumbJsonLd';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock webEnv to avoid validation issues
vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'https://example.com',
  },
}));

describe('BreadcrumbJsonLd', () => {
  it('should prevent XSS by escaping script tags in JSON-LD', () => {
    // Simulate malicious pathname containing </script>
    // URL encoded version of <script>alert(1)</script>
    vi.mocked(usePathname).mockReturnValue(
      '/en/%3Cscript%3Ealert(1)%3C%2Fscript%3E',
    );

    const { container } = render(<BreadcrumbJsonLd />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );

    expect(script).toBeInTheDocument();

    const content = script?.innerHTML || '';

    // Vulnerability Check:
    // If the content contains "</script>", the browser will close the script tag early,
    // allowing the rest of the string to be executed as HTML.
    // We expect the implementation to ESCAPE this sequence.
    expect(content).not.toContain('</script>');
  });
});
