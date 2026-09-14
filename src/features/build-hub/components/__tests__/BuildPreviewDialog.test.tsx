import { isTrustedBuildPreviewReadyMessage } from '../buildPreviewMessage';

const expectedOrigin = 'https://eso.example';
const expectedSource = {} as Window;

const message = (source: MessageEventSource | null, origin: string, data: unknown): MessageEvent =>
  new MessageEvent('message', { source, origin, data });

describe('BuildPreviewDialog iframe readiness messages', () => {
  it('accepts readiness only from the expected origin and iframe source', () => {
    expect(
      isTrustedBuildPreviewReadyMessage(
        message(expectedSource, expectedOrigin, { type: 'build-preview-ready' }),
        expectedOrigin,
        expectedSource,
      ),
    ).toBe(true);
  });

  it.each([
    [
      'a hostile origin',
      message(expectedSource, 'https://attacker.example', { type: 'build-preview-ready' }),
    ],
    ['a different window', message({} as Window, expectedOrigin, { type: 'build-preview-ready' })],
    ['a null source', message(null, expectedOrigin, { type: 'build-preview-ready' })],
    ['a null payload', message(expectedSource, expectedOrigin, null)],
    ['a primitive payload', message(expectedSource, expectedOrigin, 'build-preview-ready')],
    [
      'an array payload',
      message(expectedSource, expectedOrigin, [{ type: 'build-preview-ready' }]),
    ],
    ['a malformed payload', message(expectedSource, expectedOrigin, { type: 42 })],
    ['an unrelated payload', message(expectedSource, expectedOrigin, { type: 'other-message' })],
  ])('rejects %s', (_description, event) => {
    expect(isTrustedBuildPreviewReadyMessage(event, expectedOrigin, expectedSource)).toBe(false);
  });
});
