import { parseEsoLogsReportUrl } from './parseEsoLogsReportUrl';

const code = 'F4f2bMwWtgVKxjB9';
const base = `https://www.esologs.com/reports/${code}`;

describe('parseEsoLogsReportUrl', () => {
  it.each([
    '?fight=5',
    '?type=summary&fight=5',
    '?fight=5&type=summary',
    '#fight=5',
    '#type=summary&fight=5',
    '?type=summary#view=events&fight=5',
    '?fight=5#type=summary',
    '?fight=5#fight=5',
  ])('retains the fight from %s', (suffix) => {
    expect(parseEsoLogsReportUrl(base + suffix)).toEqual({ code, fightId: 5 });
  });

  it.each([base, `${base}/`, `${base}?type=summary`, `https://esologs.com/reports/${code}`])(
    'accepts a report without a fight: %s',
    (url) => expect(parseEsoLogsReportUrl(url)).toEqual({ code }),
  );

  it('trims pasted whitespace', () => {
    expect(parseEsoLogsReportUrl(`  ${base}#fight=5\n`)).toEqual({ code, fightId: 5 });
  });

  it.each([
    `https://evil-esologs.com/reports/${code}`,
    `https://esologs.com.evil.example/reports/${code}`,
    `https://evil.example/?next=${base}`,
    `https://www.esologs.com@evil.example/reports/${code}`,
    `https://user@www.esologs.com/reports/${code}`,
    `ftp://www.esologs.com/reports/${code}`,
    `https://www.esologs.com:1234/reports/${code}`,
    '/reports/' + code,
    'not a URL',
    base.replace(code, 'ABC123'),
    base.replace(code, 'F4f2bMwWtgVKxjB!'),
    `${base}/extra`,
  ])('rejects an invalid report URL: %s', (url) => {
    expect(parseEsoLogsReportUrl(url)).toBeNull();
  });

  it.each(['', '0', '-1', '1.5', '5junk', 'last', '2147483648', '9007199254740993'])(
    'rejects an invalid fight ID: %s',
    (fight) => expect(parseEsoLogsReportUrl(`${base}?type=summary&fight=${fight}`)).toBeNull(),
  );

  it.each(['?fight=5&fight=6', '?fight=5#fight=6', '?fight=invalid#fight=5'])(
    'rejects ambiguous fight filters: %s',
    (suffix) => expect(parseEsoLogsReportUrl(base + suffix)).toBeNull(),
  );
});
