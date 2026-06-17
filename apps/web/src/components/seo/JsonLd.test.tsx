import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { safeJsonLdStringify } from '@repo/utils';
import JsonLd from './JsonLd';

describe('safeJsonLdStringify', () => {
  it('should escape < characters to prevent XSS', () => {
    const malicious = {
      key: '<script>alert(1)</script>',
    };
    const output = safeJsonLdStringify(malicious);
    // JSON.stringify output: {"key":"<script>alert(1)</script>"}
    // safeJsonLdStringify output: {"key":"\u003cscript>alert(1)\u003c/script>"}
    expect(output).toContain('\\u003cscript>alert(1)\\u003c/script>');
    expect(output).not.toContain('<script');
  });
});

describe('JsonLd Component', () => {
  it('should render safe JSON-LD when passed malicious props', () => {
    const maliciousUrl = 'https://example.com/foo<script>alert(1)</script>';
    const { container } = render(<JsonLd baseUrl={maliciousUrl} />);
    const script = container.querySelector('script');
    expect(script).toBeDefined();
    // The content is inside a string in JSON, so it looks like "url":"...\\u003c..."
    expect(script?.innerHTML).toContain(
      '\\u003cscript>alert(1)\\u003c/script>',
    );
    expect(script?.innerHTML).not.toContain('<script');
  });
});
