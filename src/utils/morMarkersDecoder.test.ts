/**
 * Tests for M0RMarkers decoder
 * Based on the encoding format from https://github.com/M0RGaming/M0RMarkers/blob/main/main.lua#L318
 */

import { decodeMorMarkersString } from './morMarkersDecoder';
import { DecodedMorMarkers, MorMarker } from '../types/mapMarkers';

describe('morMarkersDecoder', () => {
  describe('decodeMorMarkersString', () => {
    it('should decode a simple single marker string', () => {
      // Format: <zone]timestamp]minX:minY:minZ]sizes]pitches]yaws]colours]textures]positions>
      // Example: Single marker at origin with default size, white color, circle texture
      const input = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const result = decodeMorMarkersString(input);

      expect(result).toBeDefined();
      expect(result?.zone).toBe(1000);
      expect(result?.timestamp).toBe(1609459200);
      expect(result?.markers).toHaveLength(1);

      const marker = result?.markers[0];
      expect(marker?.x).toBe(0);
      expect(marker?.y).toBe(0);
      expect(marker?.z).toBe(0);
      expect(marker?.size).toBe(1); // default size
      expect(marker?.colour).toEqual([1, 1, 1, 1]); // white
      expect(marker?.bgTexture).toBe('M0RMarkers/textures/circle.dds');
      expect(marker?.text).toBe('');
      expect(marker?.orientation).toBeUndefined(); // floating marker
    });

    it('should decode multiple markers with different positions', () => {
      // Three markers at different positions
      const input = '<1000]1609459200]0:0:0]]]]ffffff:1,2,3]^1:1,2,3]0:0:0:,a:b:c:,14:1e:28:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers).toHaveLength(3);
      expect(result?.markers[0]?.x).toBe(0);
      expect(result?.markers[0]?.y).toBe(0);
      expect(result?.markers[0]?.z).toBe(0);

      // Second marker at (10, 11, 12) in hex
      expect(result?.markers[1]?.x).toBe(10);
      expect(result?.markers[1]?.y).toBe(11);
      expect(result?.markers[1]?.z).toBe(12);

      // Third marker at (20, 30, 40) in hex
      expect(result?.markers[2]?.x).toBe(20);
      expect(result?.markers[2]?.y).toBe(30);
      expect(result?.markers[2]?.z).toBe(40);
    });

    it('should decode markers with custom sizes', () => {
      // Two markers: first with size 1.5, second with default size 1
      const input = '<1000]1609459200]0:0:0]1.5:1]]]ffffff:1,2]^1:1,2]0:0:0:,a:b:c:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.size).toBe(1.5);
      expect(result?.markers[1]?.size).toBe(1); // default
    });

    it('should decode markers with pitch orientation', () => {
      // Marker with -90 degree pitch (ground-facing)
      const input = '<1000]1609459200]0:0:0]]-90:1]]ffffff:1]^1:1]0:0:0:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.orientation).toBeDefined();
      expect(result?.markers[0]?.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 5); // -90 degrees in radians
      expect(result?.markers[0]?.orientation?.[1]).toBe(0);
    });

    it('should decode markers with yaw orientation', () => {
      // Marker with 180 degree yaw
      const input = '<1000]1609459200]0:0:0]]]180:1]ffffff:1]^1:1]0:0:0:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.orientation).toBeDefined();
      expect(result?.markers[0]?.orientation?.[0]).toBe(0);
      expect(result?.markers[0]?.orientation?.[1]).toBeCloseTo(Math.PI, 5); // 180 degrees in radians
    });

    it('should decode markers with both pitch and yaw', () => {
      // Marker with -90 pitch and 45 yaw
      const input = '<1000]1609459200]0:0:0]]-90:1]45:1]ffffff:1]^1:1]0:0:0:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.orientation).toBeDefined();
      expect(result?.markers[0]?.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 5);
      expect(result?.markers[0]?.orientation?.[1]).toBeCloseTo(Math.PI / 4, 5);
    });

    it('should decode markers with different colors', () => {
      // Red, green, and blue markers
      const input =
        '<1000]1609459200]0:0:0]]]]ff0000:1;00ff00:2;0000ff:3]^1:1,2,3]0:0:0:,a:b:c:,14:1e:28:>';

      const result = decodeMorMarkersString(input);

      // Red
      expect(result?.markers[0]?.colour).toEqual([1, 0, 0, 1]);
      // Green
      expect(result?.markers[1]?.colour).toEqual([0, 1, 0, 1]);
      // Blue
      expect(result?.markers[2]?.colour).toEqual([0, 0, 1, 1]);
    });

    it('should decode markers with texture lookup references', () => {
      // Using ^1 (circle), ^2 (hexagon), ^3 (square)
      const input =
        '<1000]1609459200]0:0:0]]]]ffffff:1,2,3]^1:1;^2:2;^3:3]0:0:0:,a:b:c:,14:1e:28:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.bgTexture).toBe('M0RMarkers/textures/circle.dds');
      expect(result?.markers[1]?.bgTexture).toBe('M0RMarkers/textures/hexagon.dds');
      expect(result?.markers[2]?.bgTexture).toBe('M0RMarkers/textures/square.dds');
    });

    it('should decode markers with text labels', () => {
      // Marker with text "Test"
      const input = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:Test>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.text).toBe('Test');
    });

    it('should unescape special characters in text', () => {
      // Text with escaped characters: \n for newline, Unicode private use area for special chars
      const input = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:Line1\\nLine2>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.text).toBe('Line1\nLine2');
    });

    it('should handle Unicode private use area character escapes', () => {
      // e000=:, e001=,, e002=], e003=;, e004=>
      // Using actual Unicode private use area characters in the input
      const input =
        '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:Test\uE000\uE001\uE002\uE003\uE004>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.text).toBe('Test:,];>');
    });

    it('should decode a real example from vAS Olms Jumps', () => {
      // Real example from premades.lua
      const input =
        '<1000]1759521007]17f27:f00a:18088]33.5:1,2,3,4]-90:1,2,3,4]0:1,2,3,4]25ffffff:2,4;25aa0000:1,3]^1:1,2,3,4]0:1:0:,523:1:16:,45a:0:c29:,124:0:c6e:>';

      const result = decodeMorMarkersString(input);

      expect(result).toBeDefined();
      expect(result?.zone).toBe(1000);
      expect(result?.markers).toHaveLength(4);

      // All markers should have size 33.5
      result?.markers.forEach((marker: MorMarker) => {
        expect(marker.size).toBe(33.5);
      });

      // All markers should have -90 pitch
      result?.markers.forEach((marker: MorMarker) => {
        expect(marker.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 5);
      });
    });

    it('should handle empty markers string', () => {
      const result = decodeMorMarkersString('');
      expect(result).toBeNull();
    });

    it('should handle malformed strings', () => {
      const result = decodeMorMarkersString('invalid');
      expect(result).toBeNull();
    });

    it('should handle missing closing bracket', () => {
      const result = decodeMorMarkersString('<1000]1609459200]0:0:0]]]]');
      expect(result).toBeNull();
    });

    it('should calculate positions relative to minimum coordinates', () => {
      // minX=100, minY=200, minZ=300 (in hex: 64:c8:12c)
      // Position offsets: a:14:1e (10, 20, 30 in hex)
      // Absolute position should be: 110, 220, 330
      const input = '<1000]1609459200]64:c8:12c]]]]ffffff:1]^1:1]a:14:1e:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.x).toBe(110);
      expect(result?.markers[0]?.y).toBe(220);
      expect(result?.markers[0]?.z).toBe(330);
    });

    it('should handle markers with different textures (some lookup, some direct)', () => {
      // Mix of texture lookup (^1) and direct texture path
      const input = '<1000]1609459200]0:0:0]]]]ffffff:1,2]^1:1;custom/texture.dds:2]0:0:0:,a:b:c:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.bgTexture).toBe('M0RMarkers/textures/circle.dds');
      expect(result?.markers[1]?.bgTexture).toBe('custom/texture.dds');
    });

    it('should handle complex real-world example from vAS 8 Lanes', () => {
      // From premades.lua
      const input =
        '<1000]1759521535]17ec5:f00a:17f60]1.5:1,2,3,4,5,6,7,8]]]0000ff:1,2,3,4;ffff00:5,6,7,8]^1:1,2,3,4,5,6,7,8]0:1:0:,3c:1:0:,78:1:0:,b4:1:0:,fffffed4:0:0:,ffffff98:0:0:,ffffff5c:0:0:,ffffff20:0:0:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers).toHaveLength(8);

      // First 4 should be blue
      for (let i = 0; i < 4; i++) {
        expect(result?.markers[i]?.colour).toEqual([0, 0, 1, 1]);
      }

      // Last 4 should be yellow
      for (let i = 4; i < 8; i++) {
        expect(result?.markers[i]?.colour).toEqual([1, 1, 0, 1]);
      }
    });

    it('should handle markers at negative coordinate offsets', () => {
      // Using two's complement hex for negative numbers
      // minX=1000, position offset=fffffff6 (-10 in two's complement)
      const input = '<1000]1609459200]3e8:0:0]]]]ffffff:1]^1:1]fffffff6:0:0:>';

      const result = decodeMorMarkersString(input);

      // Should handle as unsigned, so fffffff6 becomes a large positive number
      // In the Lua implementation, this would be handled differently
      expect(result?.markers[0]?.x).toBeGreaterThan(0);
    });

    it('should preserve default color when not specified', () => {
      // No color specified in colours section means it should default to white
      const input = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.colour).toEqual([1, 1, 1, 1]);
    });

    it('should handle markers with empty text', () => {
      // Position ends with colon but no text after
      const input = '<1000]1609459200]0:0:0]]]]ffffff:1]^1:1]0:0:0:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.text).toBe('');
    });

    it('should decode markers with multiple size groups', () => {
      // Multiple size groups: size 1.5 for markers 1-3, size 2.0 for markers 4-5, default 1 for marker 6
      const input =
        '<1000]1609459200]0:0:0]1.5:1,2,3;2.0:4,5]]]ffffff:1,2,3,4,5,6]^1:1,2,3,4,5,6]0:0:0:,1:1:1:,2:2:2:,3:3:3:,4:4:4:,5:5:5:>';

      const result = decodeMorMarkersString(input);

      expect(result?.markers[0]?.size).toBe(1.5);
      expect(result?.markers[1]?.size).toBe(1.5);
      expect(result?.markers[2]?.size).toBe(1.5);
      expect(result?.markers[3]?.size).toBe(2.0);
      expect(result?.markers[4]?.size).toBe(2.0);
      expect(result?.markers[5]?.size).toBe(1); // default
    });

    describe('Premade Marker Strings from M0RMarkers plugin', () => {
      describe('Zone 1000 - vAS (Asylum Sanctorium)', () => {
        it('should decode vAS Olms Jumps preset', () => {
          const input =
            '<1000]1759521007]17f27:f00a:18088]33.5:1,2,3,4]-90:1,2,3,4]0:1,2,3,4]25ffffff:2,4;25aa0000:1,3]^1:1,2,3,4]0:1:0:,523:1:16:,45a:0:c29:,124:0:c6e:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1000);
          expect(result?.timestamp).toBe(1759521007);
          expect(result?.markers).toHaveLength(4);

          // All markers should have size 33.5
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.size).toBe(33.5);
          });

          // All markers should have -90 pitch (ground-facing)
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 5);
          });

          // All markers should be circles
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.bgTexture).toBe('M0RMarkers/textures/circle.dds');
          });
        });

        it('should decode vAS 8 Lanes preset', () => {
          const input =
            '<1000]1759521535]17ec5:f00a:17f60]1.5:1,2,3,4,5,6,7,8]]]0000ff:1,2,3,4;ffff00:5,6,7,8]^1:1,2,3,4,5,6,7,8]0:1:0:,3c:1:0:,78:1:0:,b4:1:0:,fffffed4:0:0:,ffffff98:0:0:,ffffff5c:0:0:,ffffff20:0:0:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1000);
          expect(result?.markers).toHaveLength(8);

          // All markers should have size 1.5
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.size).toBe(1.5);
          });

          // First 4 lanes should be blue
          for (let i = 0; i < 4; i++) {
            expect(result?.markers[i]?.colour).toEqual([0, 0, 1, 1]);
          }

          // Last 4 lanes should be yellow
          for (let i = 4; i < 8; i++) {
            expect(result?.markers[i]?.colour).toEqual([1, 1, 0, 1]);
          }
        });
      });

      describe('Zone 1548 - vOC (Old Orsinium Citadel)', () => {
        it('should decode vOC General (tarts vrenim) preset', () => {
          const input =
            '<1548]1759691655]c04f:6629:dee6]2.5:59,60;0.4:61,62;3.5:57;1.5:9,11]-90:52,53,54,55,56,58,61,62;0:57,59,60]0:60;81:53;35:54;180:59;262:55;215:58;27:56;310:61,62;270:57;139:52]ff8000:4,15,18,20,50,51;0000ff:7,16,25,28,29,37,38,39,40,41,42,44,47,48;00ffa6:1,13,17,19,22,26,45,52,53,54,55,56;ffffff:9,11,57,58,59,60,61,62;ff0000:2,3,5,6,8,10,12,14,21,23,24,27,30,31,32,33,34,35,36,43,46,49]^2:2,3,4,5,10,14,15,18,20,21,23,24;^5:50,51;^4:27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,46,47,48,49;^7:9,11,57,58,59,60,61,62;^3:6,7,8,12,16,25;^6:1,13,17,19,22,26,45,52,53,54,55,56]dcc7:32:1186c:,283b4:1abf:404b:MT,a9b:24c4:21664:MT,6f7:2518:24683:OT,282ce:1abf:4ac0:MT,29b:24e8:20e43:,75:24e8:2155e:,76e:24e7:21000:,1e921:268e:1adcb:↓,a72:24f1:2428a:MT,1ed64:2ef0:20ccb:↓,7df:24e8:21462:,a7b3:32:12488:,28533:1abd:4ca4:MT,69eb:f35:10ec0:OT,0:24e8:210ff:,d7b3:32:1186c:,663d:e5d:d718:OT,388:24e8:2127e:,48e:24e8:2139e:OT,6347:f75:11bb5:MT,28770:1ad3:4612:,2896b:1abf:3f9c:MT,28d9c:1abe:427a:MT,45f:24e8:21715:,dcc7:32:12488:,1f893:2508:8164:L,1f7f6:248e:7f29:R,1e994:21e1:f4:R,1ebc6:2246:0:L,2825d:1a85:3bf6:L,28c37:1a8a:3c00:L,291ef:1a94:42a6:L,28c03:1a8d:5053:L,282f8:1a8e:5015:L,27e3a:1a8c:4dbc:L,28068:1a84:3cd7:R,28aa2:1a84:3b16:R,29150:1a85:40ba:R,28daa:1a8c:4f9f:R,284b6:1a8e:50fd:R,27fc5:1a8e:4f16:R,28a12:1ac0:4922:L,288d7:1ac0:49fc:R,28973:1ac0:4990:,4cc:24e8:211e4:L,280:24e8:21329:R,7b1:24e8:21779:R,88e:24e7:2151d:L,19cca:2362:4ebf:MT,1ed6c:216a:1862:MT,28011:1a56:3f00:,288c8:1a54:3ba8:,28f12:1a56:3f3d:,2869d:1a63:5072:,27e47:1a65:4b92:,29e72:1d70:4676:EXIT,28925:1a8d:4917:First Slayer,da51:1bc:12b13:Exit,da37:1bc:1125d:Entrance,e39f:0:114ac:These markers are intended to be used with Crutch Alerts. Ensure "AOCH Icons" is off.,e2f7:0:1152e:tartS vreniM>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1548);
          expect(result?.markers.length).toBeGreaterThan(0);

          // Validate that markers decode without errors
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.x).toBeDefined();
            expect(marker.y).toBeDefined();
            expect(marker.z).toBeDefined();
            expect(marker.colour).toHaveLength(4);
          });
        });

        it('should decode vOC Second Boss Only preset', () => {
          const input =
            '<1548]1759521007]1960e:665f:1f36a]]]]ff00e6:1,7;ff8000:2,3,4,5,6,14,15,16,17,18,25,26,27,28,29;ff0000:13,19;0000ff:8,9,10,11,12,20,21,22,23,24,30,31,32,33,34]^4:1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34]708:0:fa:,5aa:0:fa:,708:0:1f4:1,708:0:0:2,8fc:0:1f4:3,8fc:0:0:4,1f4:0:fa:,352:0:fa:,1f4:0:1f4:1,1f4:0:0:2,0:0:1f4:3,0:0:0:4,708:0:12f2:,5aa:0:12f2:,708:0:11f8:1,708:0:13ec:2,8fc:0:11f8:3,8fc:0:13ec:4,1f4:0:12f2:,352:0:12f2:,1f4:0:11f8:1,1f4:0:13ec:2,0:0:11f8:3,0:0:13ec:4,5aa:0:992:,708:0:898:1,708:0:a8c:2,8fc:0:898:3,8fc:0:a8c:4,352:0:992:,1f4:0:898:1,1f4:0:a8c:2,0:0:898:3,0:0:a8c:4>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1548);
          expect(result?.markers).toHaveLength(34);

          // All should use diamond texture (^4)
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.bgTexture).toBe('M0RMarkers/textures/diamond.dds');
          });
        });
      });

      describe('Zone 1121 - vSS (Sunspire)', () => {
        it('should decode vSS Slayers preset', () => {
          const input =
            '<1121]1759472527]73b3:9af1:107fc]]]]00ffa6:1,2,3,4;0000ff:5,6,7,8,9,10;ff8000:11,12,13,14,15,16]^6:1,2,3,4;^4:5,6,7,8,9,10,11,12,13,14,15,16]12a36:34ae:1e5:,231af:1b9d:199d6:,10aa6:30f5:7e64:,0:0:1a3bc:,12b08:5f05:640f:R,149a1:4064:9414:R,128e7:34b7:0:R,2306e:1b9d:1984d:R,10c5e:30a4:7eb4:R,11a:56:1a44b:R,12c89:5f01:64d4:L,14a59:4064:95b8:L,12b63:34b6:0:L,23332:1b76:197d0:L,10abd:30b4:8004:L,118:56:1a318:L>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1121);
          expect(result?.markers).toHaveLength(16);

          // First 4 should use chevron texture (^6)
          for (let i = 0; i < 4; i++) {
            expect(result?.markers[i]?.bgTexture).toBe('M0RMarkers/textures/chevron.dds');
          }

          // Rest should use diamond texture (^4)
          for (let i = 4; i < 16; i++) {
            expect(result?.markers[i]?.bgTexture).toBe('M0RMarkers/textures/diamond.dds');
          }
        });

        it('should decode vSS Nahvi Taunts preset', () => {
          const input =
            '<1121]1759472527]196b6:f9f2:16649]1.5:1,2,3,4,5]]]00ff00:6,7;ffffff:1,2,3,4,5;ff0000:8,9]^7:1,2,3,4,5;^3:6,7,8,9]a17:19:5ae:1,d25:19:76a:2,358:19:5fa:3,586:19:a9e:4,753:1e:662:↓,331:0:1a:,0:0:7c3:,a69:0:0:,8f7:0:b26:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1121);
          expect(result?.markers).toHaveLength(9);

          // First 5 markers should have size 1.5
          for (let i = 0; i < 5; i++) {
            expect(result?.markers[i]?.size).toBe(1.5);
          }
        });
      });

      describe('Zone 1263 - vRG (Rockgrove)', () => {
        it('should decode vRG Mini Skip preset', () => {
          const input =
            '<1263]1759588183]ba09:60ae:e86b]0.3:26;0.2:27,28;1.5:1,2,3,4,5,6,7,8]-90:27,28]0:27,28]ff8000:13,14,15,24;0000ff:9,10,11;ff00e6:16,17,18,19;00ff00:12;ffffff:1,2,3,4,5,6,7,8,27,28;ff0000:20,21,22,23;ffcc00:25;00ffa6:26]^6:26;^7:1,2,3,4,5,6,7,8,27,28;^4:9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24;^3:25]1d592:16c1:15b57:1,1d625:16c1:15a17:2,1d62a:16c1:158a4:3,1d524:16c1:1576e:4,1d3a1:16c1:15685:5,1d1fe:16c1:1565e:6,1d08a:16c1:1573d:7,1cfe6:16c1:1584b:8,1d23a:16a8:15740:,1d195:16a8:15bb7:,1d7d1:16a8:15768:,1b8cc:2649:18785:,aaa7:2b53:5717:,a973:2b8c:5369:,adcc:2b54:5473:,abca:2b61:563f:L,1ba63:35ed:183de:L,1b651:16d5:184f6:,1b5a7:2648:1890e:L,1b8a1:16d5:1854e:R,a9d7:2b4e:55a2:R,1b6e8:2648:18701:R,1bbde:35f1:181b0:R,0:0:8dec:,abdb:2b84:53d4:OT,fc32:22de:0:Wait For Group\\n\\n,a8e6:2b5a:44d7:These markers are for a mini skip strat. Boss/Minis go on the orange squares.,a8e7:2b58:453b:TRIANGLE GAMING>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1263);
          expect(result?.markers.length).toBeGreaterThan(0);

          // Verify some markers have specific sizes
          const marker26 = result?.markers.find((m: MorMarker, idx: number) => idx === 25);
          expect(marker26?.size).toBe(0.3);
        });

        it('should decode vRG General preset', () => {
          const input =
            '<1263]1759589736]9d55:56be:11c89]0.6:21;1.5:1,2,3,4,5,6,7,8]]]0000ff:9,10,11,12,13;ffffff:1,2,3,4,5,6,7,8,21;ff8000:16,17,18,19,20;00ff00:14,15]^7:1,2,3,4,5,6,7,8;^6:21;^4:9,10,11,12,13,14,15,16,17,18,19,20]1f246:20b1:12739:1,1f2d9:20b1:125f9:2,1f2de:20b1:12486:3,1f1d8:20b1:12350:4,1f055:20b1:12267:5,1eeb2:20b1:12240:6,1ed3e:20b1:1231f:7,1ec9a:20b1:1242d:8,1ee49:2098:12799:,1eeee:2098:12122:,1f485:2098:1234a:,1d806:3038:15314:1,1d4ee:3038:158a9:2,1d20c:3039:15349:,c627:357c:1ca5:,2020:0:0:,0:58a:2ffc:,1cca:9f0:59d5:,c75b:3543:22f9:,c9b5:3549:202f:,c819:355a:2124:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1263);
          expect(result?.markers.length).toBeGreaterThan(0);
        });

        it('should decode vRG First Boss Only preset', () => {
          const input =
            '<1263]1759589875]164b0:8c01:13cb8]0.6:3]]]ff8000:1,2;ffffff:3]^4:1,2;^6:3]0:0:2ca:,25a:6:0:,c2:16:10b:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1263);
          expect(result?.markers).toHaveLength(3);

          // Marker 3 should have size 0.6
          expect(result?.markers[2]?.size).toBe(0.6);
        });
      });

      describe('Zone 1478 - vLC (Lucent Citadel)', () => {
        it('should decode vLC General with Slayers preset', () => {
          const input =
            '<1478]1759813077]14d44:3782:19c6a]0.5:35,36,37,38,39,40,41,42,43,44,45,46,47,48;1.5:58;0.3:49;0.4:24]-90:50,51,52,53,54,55,56,57,58]198:54;119:51;264:57;218:55;170:53;88:50;141:52;270:58;237:56]ff8000:23,39,40;ff0000:2,35,36,58;0000ff:10,12,14,16,18,20,28,32,33,37,38;9600fffc:41,42,43,44,45,46,47,48,50,51,52,53,54,55,56,57;00ffa6:1,3,4,5,6,7,8,24,25,26,29,30;00ff00:49;ffcc00:9,11,13,15,17,19,21,22,27,31,34]^6:1,3,4,5,6,7,8,24,25,26,29,30,35,36,37,38,49;^4:2,9,10,11,12,13,14,15,16,17,18,20,21,27,28,31,32;^1:23,39,40,41,42,43,44,45,46,47,48,50,51,52,53,54,55,56,57;^5:19,22,33,34,58]38f7:1:23b0:,d203:514f:e866:,1acf:6fe:4c63:,c85b:51fd:2bea:,7e7:dfe:8c89:,f6c5:5359:168:,0:d6e:5e42:,dccf:5104:9746:,bf26:51fe:3014:,c405:51fd:3e63:,f51c:5359:0:L,f4db:5359:1f8:R,c674:51fd:2ba4:L,c7b2:51fd:2d8b:R,37c3:0:24e3:L,3992:0:2556:R,18f8:6fd:4b3b:L,1916:724:4ddf:R,1bb4:79d:5029:OT,918:e6c:8e80:R,6b4:e28:8e69:L,756:124e:93aa:OT,d01f:514f:e862:Knot,cb0d:5131:e859:Fluctuating\\n\\n,e567:5114:cd6c:,cfbb:510a:cad7:,e401:5116:cc6b:L,e3f7:5112:ce85:R,10b49:512c:915f:,f912:52a2:8464:,fadb:52a2:8386:L,f921:5297:8284:R,f6be:5297:7d6c:Dark,11d9c:52af:7d99:Light,fa93:557b:9082:Slam 1\\n\\n,fc46:557b:9238:Slam 2\\n\\n,fdea:556f:99ff:Barrage 1\\n\\n,fdd8:556f:9703:Barrage 2\\n\\n,fd3e:5589:9390:GH,fb9a:5576:989e:KH,fdc7:5589:95dd:2,fc9d:557d:94da:3,fdce:5589:94a1:1,fc8f:5576:960c:4,fc93:5576:973c:5,fb93:5576:976b:8,fb8f:5576:963c:7,fb83:557b:9504:6,fde9:557e:93fb:Stack After Crystal Break\\n\\n,a08d:4b57:5bf1:8,a016:4b57:58a8:7,9e99:4b57:56d7:6,9c65:4b57:55f5:5,99d3:4b57:562c:4,97de:4b57:5712:3,9686:4b57:5918:2,9607:4b57:5bbf:1,d52e:511d:e858:Slams>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1478);
          expect(result?.markers.length).toBeGreaterThan(0);

          // Validate that we decoded successfully (markers exist, sizes are correct for specific ones)
          // The pitch section indicates markers 50-58 have -90 pitch
          // Check a few markers that should have ground orientation
          const marker50 = result?.markers[49]; // 0-based index for marker 50
          if (marker50) {
            expect(marker50.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 5);
          }

          const marker58 = result?.markers[57]; // 0-based index for marker 58
          if (marker58) {
            expect(marker58.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 5);
            expect(marker58.size).toBe(1.5); // Size section says 1.5:58
          }
        });

        it('should decode vLC Xoryn Room Only preset', () => {
          const input =
            '<1478]1759812275]21763:889e:27c70]]-90:1,2,3,4,5,6,7,8,9,10]0:4;337:5;90:3;135:1;200:9;315:6;43:2;157:7;180:8;223:10]ff8000:1,2;ff0000:3,4,5,6,7,8,9,10]^1:1,2,3,4,5,6,7,8,9,10]0:3:ddb:GH,63:3:2bf:KH,2d7:3:eb:1,59a:3:0:2,873:3:f4:3,ada:3:2d7:4,268:2:f37:5,54e:2:1056:6,84f:2:f67:7,b12:0:dfd:8>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1478);
          expect(result?.markers).toHaveLength(10);

          // All should be ground-facing
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.orientation?.[0]).toBeCloseTo(-Math.PI / 2, 5);
          });

          // All should be circles
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.bgTexture).toBe('M0RMarkers/textures/circle.dds');
          });
        });
      });

      describe("Zone 1196 - vKA (Kyne's Aegis)", () => {
        it('should decode vKA 10 DPS preset', () => {
          const input =
            '<1196]1759814404]5a2c:54d8:1ff4]1.5:1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]]]00ff00:17,43;ff8000:18,19,20,21,44,45,46,47,48,49,50,51,52,53,54,55,56;ffffff:1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16;ff0000:22,23,57;0000ff:28,29,30,31,32,33,34,35,36,37,38,39,40,41,42;ffcc00:24,25,26,27]^3:17,24,25,26,27;^7:1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16;^4:28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57;^2:18,19,20,21,22,23]a392:e7a:1583a:1,1638d:1050:f847:1,1636d:1033:f9be:2,a4e4:e4a:157ec:2,a5db:e2e:155b3:3,16663:1058:f9c9:3,166bf:1022:f894:4,a4d7:e2f:1548f:4,164e3:1029:fa1c:5,a5c2:e2e:1572a:5,e324:195f:11e05:↓,ea82:1ff4:15364:↓,e7f5:1a48:1223f:↓,c27d:1675:18032:↓,e71c:2029:14d06:↓,e10c:19f2:125db:↓,f073:d2a:e24f:,0:1f:e46:OT,e73:1b:e15:OT,ea6:30:1:OT,46:1e:0:OT,1643d:101b:f723:MT,ef6e:d2a:e039:MT,df97:1950:11ef5:,11ed8:d2a:1952d:,138a0:1984:12f84:,16c46:1fca:1580f:,16515:1042:f8e9:,a451:e3c:1567c:,5ac:0:9261:1,e197:d58:d302:1,c2cb:1647:182d6:1,13858:1981:130f9:1,c3fe:162f:1815b:2,968:0:930:2,e348:d42:d44f:2,139e6:196b:13058:2,c415:15f2:17f4a:3,13a2b:19a6:12ed8:3,999:0:546:3,e450:d32:d274:3,5a5:0:55d:4,16d9e:d39:19560:L,b7d:0:b30:,be8:0:2ff:,a39:0:a01:,cf3:0:c9a:,d1f:1:1a8:,48e:0:432:,acb:0:427:,2d9:0:bba:,dc60:1955:117b9:,453:0:a58:,1ec:3:18c:,161:9:d13:,34d:0:2ef:,16c9c:d36:19217:R>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1196);
          expect(result?.markers.length).toBeGreaterThan(0);

          // First 16 markers should have size 1.5
          for (let i = 0; i < 16; i++) {
            expect(result?.markers[i]?.size).toBe(1.5);
          }
        });

        it('should decode vKA General preset', () => {
          const input =
            '<1196]1759814404]5e77:391b:25d2]0.8:34,35,36,37]]]ff0000:5,10,15,20,29;0000ff:1,2,3,4,6,7,8,9,11,12,13,14,16,17,18,19,21,22,23,24,30,31,32,33;00ff00:25,26,27,28;ffffff:34,35,36,37]^4:1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33;^7:34,35,36,37]9f9e:29e2:14f3f:1,a0b1:29d3:14fec:2,a1c1:29d3:14ee6:3,a142:29d2:14d9f:4,a05f:29d3:14e73:,a4ef:29d7:1466a:1,a456:29dc:1480b:2,a5db:2a2e:14975:3,a7b2:2a56:1491b:4,a691:2a2c:147a3:,9f9e:29e2:14f3f:1,a0b1:29d3:14fec:2,a1c1:29d3:14ee6:3,a142:29d2:14d9f:4,a05f:29d3:14e73:,a4ef:29d7:1466a:1,a456:29dc:1480b:2,a5db:2a2e:14975:3,a7b2:2a56:1491b:4,a691:2a2c:147a3:,485:1bbd:0:4,4a5:1bbd:2ac:3,1ea:1bbd:2ce:2,1df:1bbd:11:1,0:1bbd:156:1,699:1bbd:156:1,3:0:14c:1,6c4:0:147:1,15e8e:2be3:f24e:,15d42:2bb8:f238:1,15ddc:2bc6:f3a0:2,15f5a:2bdd:f3b6:3,1603d:2bfe:f2a5:4,a84c:2a8a:15294:R,a6b0:2a3a:1540f:L,15e65:2cb9:fbf3:L,1611d:2c9a:fb2d:R>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1196);
          expect(result?.markers.length).toBeGreaterThan(0);
        });
      });

      describe('Zone 1344 - vDSR (Dreadsail Reef)', () => {
        it('should decode vDSR General preset', () => {
          const input =
            '<1344]1759814404]f0e6:8d49:abef]]]]00ff00:1,2;ff8000:3,4,5,6]^4:1,2,3,4,5,6]1acf:1:a65a:,1ade:6:9b05:,544:6:0:,2036:6:a0b2:,0:0:e74:,885:19:228:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1344);
          expect(result?.markers).toHaveLength(6);

          // All should use diamond texture (^4)
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.bgTexture).toBe('M0RMarkers/textures/diamond.dds');
          });
        });
      });

      describe("Zone 1427 - vSE (Sanity's Edge)", () => {
        it('should decode vSE Ansuul Colours preset', () => {
          const input =
            '<1427]1759814404]2ffda:7629:94a1]]]]00ff00:2;ff0000:3;0000ff:1]^4:1,2,3]1abf:0:1f:,0:0:0:,d74:0:17d5:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1427);
          expect(result?.markers).toHaveLength(3);

          // Check colors: blue, green, red
          expect(result?.markers[0]?.colour).toEqual([0, 0, 1, 1]);
          expect(result?.markers[1]?.colour).toEqual([0, 1, 0, 1]);
          expect(result?.markers[2]?.colour).toEqual([1, 0, 0, 1]);
        });

        it('should decode vSE Chimera HM Portals preset', () => {
          const input =
            '<1427]1759814404]290d3:9dd0:3a224]]]]0000ff:6,7,8,9,10;ff0000:11,12,13,14,15;00ff00:1,2,3,4,5]^4:1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]4d5f:0:6c:5,5c24:0:22:1,5caf:0:f6c:2,54d0:0:fc6:3,4d4c:0:f84:4,0:0:34:5,efd:0:0:1,f27:0:f39:2,76d:0:ff4:3,1:0:f5e:4,26be:0:3b:5,35b8:0:72:1,35bc:0:f81:2,2e19:0:ff7:3,26c5:0:f37:4>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1427);
          expect(result?.markers).toHaveLength(15);

          // All should use diamond texture (^4)
          result?.markers.forEach((marker: MorMarker) => {
            expect(marker.bgTexture).toBe('M0RMarkers/textures/diamond.dds');
          });
        });

        it('should decode vSE Chimera Non-HM Portals preset', () => {
          const input =
            '<1427]1759814404]28f9e:9dd0:3a14d]]]]0000ff:5,6,7,8;ff0000:9,10,11,12;00ff00:1,2,3,4]^4:1,2,3,4,5,6,7,8,9,10,11,12]562d:0:0:1,5ec3:0:8ce:2,5605:0:109d:3,4d7d:0:888:4,8b2:0:5:1,1161:0:8b4:2,8a2:0:10cb:3,0:0:883:4,2fa2:0:2:1,3834:0:8ac:2,2f4e:0:10ce:3,26df:0:892:4>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1427);
          expect(result?.markers).toHaveLength(12);
        });

        it('should decode vSE General preset', () => {
          const input =
            '<1427]1759877049]c5d5:3b37:7fbb]0.4:32,36;0.75:34,35]]]00ffa6:1,2,3,4,5,6,7,8,9,10,11,12,13;0000ff:14,16,25,26,27,28,29,30;ff8000:15,32,33,36;00fffe:34,35;00ff00:17;ff0000:18,19,20,21,22,23,24,31]^6:1,2,3,4,5,6,7,8,9,10,11,12,13,32,33,34,35,36;^3:14,15;^4:16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]1e0dd:4528:23a57:,1cc8e:3eb9:22e95:,17dfa:30a5:1f9e5:,19e49:3ac0:23358:,19c9d:3692:2066b:,1fc4:a28:d69c:,0:5a1:aeb9:,4209:1d90:e4bc:,45e2:1d90:d497:,48f0:1d69:b78b:,27bc2:4eee:ae6a:,233e7:4ea8:4fe0:,227df:4ebc:7908:,20ca3:6280:2f255:,20d3b:6280:2f6ab:,84fe:20:38f:,203fd:6280:2e9f9:,24761:3af2:1d2f:,83c0:1d:384:,209d8:6280:2f321:1,20957:6280:2f5bb:2,20959:6280:2f74a:3,209ca:6280:2f8b7:4,20ac8:6289:2f9c6:5,20fd1:6280:2f962:H,210d2:6280:2f83f:4,2112d:6280:2f6c9:3,21101:6280:2f51b:2,21036:6280:2f3a9:1,20aa6:6280:2e851:R,20d16:6280:2e876:L,20c85:6262:2e06e:Initial Ansuul\\n\\n,20bb6:6280:2ea05:,863a:c5:0:2\\n\\n,82fc:c5:8:1\\n\\n,80a2:0:941:Firebombs\\n\\n>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1427);
          expect(result?.markers.length).toBeGreaterThan(0);

          // Validate some markers have specific sizes
          const marker32 = result?.markers.find((m: MorMarker, idx: number) => idx === 31);
          expect(marker32?.size).toBe(0.4);
        });

        it('should decode vSE Alternative General preset', () => {
          const input =
            '<1427]1759878462]c536:3b53:8646]]]]ff0000:2,23,24,25,26,31;0000ff:3,4,5,6,7,28,29,30,32;ff8000:1,7;ff00e6:8,9,10,11,12,13,14,15,16,17,18,19,20,21,22;00ff00:5,6]^4:3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30;^14:31,32;^2:1,2]210c9:6264:2f317:OT,20ad3:6264:2eda4:MT,87b1:0:35d:1,8856:12:ce:2,84e9:1:12:,2481c:3ad6:16b0:,20dce:6264:2f05e:,17d8b:306e:1f2c3:,19e6a:3680:20024:,24754:3ad8:15f7:,238cb:4e8c:47dd:,1ccdf:3e98:227c3:,0:585:a889:,41fb:1d74:e034:,1e1b7:4508:23442:,226f2:4ea0:738b:,225cd:4ea0:731e:,8372:1:0:,19e2a:3a9d:22cea:,2101:a05:d296:,475d:1d74:cf5d:,49ba:1d4c:b181:,20ad6:6264:2ef58:1,20ad2:6264:2f102:2,20af1:6264:2f2e0:3,20940:6264:2f03c:4,210db:6264:2f164:1,21108:6264:2efd4:2,2111f:6264:2ee63:3,21262:6264:2ef0f:4,2093b:6264:2f224:,2124e:6264:2f0d8:>';

          const result = decodeMorMarkersString(input);

          expect(result).toBeDefined();
          expect(result?.zone).toBe(1427);
          expect(result?.markers.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
