import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

interface RedirectRun {
  replacedWith: string;
  storedPath: string | null;
}

function extractInlineScript(source: string): string | undefined {
  const openingTag = '<script>';
  const closingTag = '</script>';
  const scriptStart = source.indexOf(openingTag);
  if (scriptStart < 0) return undefined;

  const contentStart = scriptStart + openingTag.length;
  const scriptEnd = source.indexOf(closingTag, contentStart);
  if (scriptEnd < 0) return undefined;

  return source.slice(contentStart, scriptEnd);
}

function executeRedirectScript(
  source: string,
  href: string,
  options: { storageUnavailable?: boolean } = {},
): RedirectRun {
  const locationUrl = new URL(href);
  let replacedWith = '';
  let storedPath: string | null = null;
  const location = {
    get hash() {
      return locationUrl.hash;
    },
    get origin() {
      return locationUrl.origin;
    },
    get pathname() {
      return locationUrl.pathname;
    },
    get search() {
      return locationUrl.search;
    },
    replace(value: string | URL) {
      replacedWith = String(value);
    },
  };

  vm.runInNewContext(source, {
    URL,
    window: { location },
    sessionStorage: {
      setItem(key: string, value: string) {
        if (options.storageUnavailable) throw new Error('storage blocked');
        if (key === 'redirectPath') storedPath = value;
      },
    },
  });

  return { replacedWith, storedPath };
}

describe('static-host redirect privacy', () => {
  const publicRedirect = fs.readFileSync(
    path.join(process.cwd(), 'public', '404-redirect.js'),
    'utf8',
  );
  const previewShell = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'dev-previews-404.html'),
    'utf8',
  );
  const previewRedirect = extractInlineScript(previewShell);

  it('keeps a production support report in session storage and out of the redirect query', () => {
    const run = executeRedirectScript(
      publicRedirect,
      'https://esotk.com/kalpa/support#kalpa=private-report',
    );

    expect(run.storedPath).toBe('/kalpa/support#kalpa=private-report');
    expect(new URL(run.replacedWith).searchParams.get('redirect')).toBe('/kalpa/support');
    expect(run.replacedWith).not.toContain('private-report');
  });

  it('fails closed without storage instead of putting a support report in a query', () => {
    const run = executeRedirectScript(
      publicRedirect,
      'https://esotk.com/kalpa/support?source=desktop#kalpa=private-report',
      { storageUnavailable: true },
    );

    expect(new URL(run.replacedWith).searchParams.get('redirect')).toBe(
      '/kalpa/support?source=desktop',
    );
    expect(run.replacedWith).not.toContain('private-report');
  });

  it('keeps ordinary non-support hash routing behavior unchanged', () => {
    const run = executeRedirectScript(
      publicRedirect,
      'https://esotk.com/report/example#section-two',
      { storageUnavailable: true },
    );

    expect(new URL(run.replacedWith).searchParams.get('redirect')).toBe(
      '/report/example#section-two',
    );
  });

  it('fails closed for a preview support handoff when storage is unavailable', () => {
    expect(previewRedirect).toBeDefined();
    const run = executeRedirectScript(
      previewRedirect!,
      'https://eso-toolkit.github.io/dev-previews/pr-1469/kalpa/support/#kalpa=private-report',
      { storageUnavailable: true },
    );

    expect(new URL(run.replacedWith).searchParams.get('redirect')).toBe(
      '/dev-previews/pr-1469/kalpa/support/',
    );
    expect(run.replacedWith).not.toContain('private-report');
  });
});
