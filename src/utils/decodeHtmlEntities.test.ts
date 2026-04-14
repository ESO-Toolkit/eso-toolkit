import { decodeHtmlEntities } from './decodeHtmlEntities';

describe('decodeHtmlEntities', () => {
  it("decodes &#x27; to an apostrophe (Spike's Trial Necessities case)", () => {
    expect(decodeHtmlEntities('Spike&#x27;s Trial Necessities')).toBe("Spike's Trial Necessities");
  });

  it('decodes all entities produced by the server escapeHtml', () => {
    expect(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#x27;')).toBe(`& < > " '`);
  });

  it('decodes &amp; last so escaped entities survive a round-trip', () => {
    // `&amp;#x27;` is the result of double-escaping `&#x27;` — decoding once
    // should yield `&#x27;` (not `'`), because only a single layer of
    // escaping was applied.
    expect(decodeHtmlEntities('&amp;#x27;')).toBe('&#x27;');
  });

  it('leaves plain text untouched', () => {
    expect(decodeHtmlEntities('Hello world')).toBe('Hello world');
    expect(decodeHtmlEntities('')).toBe('');
  });

  it('does not decode entities outside the server allow-list', () => {
    // The server never produces &nbsp; or &#39; — we should not decode them
    // either, to keep behavior aligned with the server's escape set.
    expect(decodeHtmlEntities('a&nbsp;b')).toBe('a&nbsp;b');
    expect(decodeHtmlEntities('a&#39;b')).toBe('a&#39;b');
  });
});
