import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BreadcrumbJsonLd from './BreadcrumbJsonLd';

// Mock dependencies
vi.mock('@repo/env/web', () => ({
  webEnv: {
    NEXT_PUBLIC_SITE_URL: 'https://example.com',
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from 'next/navigation';

describe('BreadcrumbJsonLd', () => {
  it('should escape malicious scripts in JSON-LD', () => {
    // Mock a malicious path that could cause XSS if not escaped
    // The path contains encoded <script> tags: /en/<script>alert(1)</script>
    // In URL encoded form: /en/%3Cscript%3Ealert(1)%3C%2Fscript%3E
    vi.mocked(usePathname).mockReturnValue('/en/%3Cscript%3Ealert(1)%3C%2Fscript%3E');

    const result = render(<BreadcrumbJsonLd />);
    const container = result.container;

    const scriptTag = container.querySelector('script[type="application/ld+json"]');

    expect(scriptTag).not.toBeNull();

    const content = scriptTag?.innerHTML || '';

    // Check for the presence of the malicious payload
    // If vulnerable, it will contain unescaped HTML tags that break the JSON context
    // Specifically, we look for the closing script tag which allows breaking out of the script block
    // We expect it to be escaped as \u003c/script>

    if (content.includes('</script>')) {
      throw new Error('Vulnerability found: Unescaped </script> tag detected in JSON-LD output!');
    }

    expect(content).not.toContain('<script>');
    expect(content).toContain('\\u003cscript>');
    expect(content).toContain('\\u003c/script>');
  });
});
