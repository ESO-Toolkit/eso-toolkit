import {
  decodeElmsMarkersString,
  isElmsMarkersFormat,
  MAX_ELMS_MARKERS,
} from './elmsMarkersDecoder';

describe('elmsMarkersDecoder', () => {
  it('decodes a basic marker string', () => {
    const result = decodeElmsMarkersString('/1000//100,200,300,1/');
    expect(result.zone).toBe(1000);
    expect(result.markers).toHaveLength(1);
    expect(result.markers[0].x).toBe(100);
    expect(result.markers[0].z).toBe(300);
  });

  it('accepts negative coordinates on negative-bound maps', () => {
    const result = decodeElmsMarkersString('/975//-3414,0,-13285,1/');
    expect(result.zone).toBe(975);
    expect(result.markers[0].x).toBe(-3414);
    expect(result.markers[0].z).toBe(-13285);
  });

  it('detects signed-coordinate strings as Elms format', () => {
    expect(isElmsMarkersFormat('/975//-3414,0,-13285,1/')).toBe(true);
    expect(isElmsMarkersFormat('not markers')).toBe(false);
  });

  it('reports dropped zones instead of silently discarding them', () => {
    const result = decodeElmsMarkersString('/1000//1,2,3,1//639//4,5,6,1/');
    expect(result.zone).toBe(1000);
    expect(result.markers).toHaveLength(1);
    expect(result.droppedZones).toEqual([639]);
  });

  it('truncates floods at the cap and flags it', () => {
    const input = Array.from(
      { length: MAX_ELMS_MARKERS + 100 },
      (_, i) => `/1000//${i},0,0,1/`,
    ).join('');
    const result = decodeElmsMarkersString(input);
    expect(result.markers).toHaveLength(MAX_ELMS_MARKERS);
    expect(result.truncated).toBe(true);
  });

  it('rejects empty and oversized input', () => {
    expect(() => decodeElmsMarkersString('')).toThrow();
    expect(() => decodeElmsMarkersString('   ')).toThrow();
    expect(() => decodeElmsMarkersString(`/1000//${'1'.repeat(300000)},0,0,1/`)).toThrow(/256KB/);
  });

  it('still throws when no valid markers are found', () => {
    expect(() => decodeElmsMarkersString('/abc//def/')).toThrow();
  });
});
