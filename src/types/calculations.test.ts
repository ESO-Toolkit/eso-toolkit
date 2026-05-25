/**
 * Tests for calculations types
 * Comprehensive test coverage for calculation and data processing types
 */

import { BaseDataPoint, BaseCalculationTask, BaseCalculationResult } from './calculations';

describe('calculations types', () => {
  describe('BaseDataPoint interface', () => {
    it('should be assignable with required properties', () => {
      const dataPoint: BaseDataPoint = {
        timestamp: 1000000,
        value: 1500,
        sources: ['ability:12345', 'player:123'],
      };

      expect(dataPoint.timestamp).toBe(1000000);
      expect(dataPoint.value).toBe(1500);
      expect(dataPoint.sources).toEqual(['ability:12345', 'player:123']);
    });

    it('should require all properties', () => {
      const dataPoint: BaseDataPoint = {
        timestamp: 1234567890,
        value: 100,
        sources: ['test-source'],
      };

      expect(typeof dataPoint.timestamp).toBe('number');
      expect(typeof dataPoint.value).toBe('number');
      expect(Array.isArray(dataPoint.sources)).toBe(true);
    });

    it('should handle various numeric values', () => {
      const positiveValue: BaseDataPoint = {
        timestamp: 1000000,
        value: 42,
        sources: ['positive'],
      };

      const negativeValue: BaseDataPoint = {
        timestamp: 1000000,
        value: -42,
        sources: ['negative'],
      };

      const zeroValue: BaseDataPoint = {
        timestamp: 1000000,
        value: 0,
        sources: ['zero'],
      };

      const floatValue: BaseDataPoint = {
        timestamp: 1000000,
        value: 42.5,
        sources: ['float'],
      };

      expect(positiveValue.value).toBe(42);
      expect(negativeValue.value).toBe(-42);
      expect(zeroValue.value).toBe(0);
      expect(floatValue.value).toBe(42.5);
    });

    it('should handle various source arrays', () => {
      const emptySources: BaseDataPoint = {
        timestamp: 1000000,
        value: 100,
        sources: [],
      };

      const singleSource: BaseDataPoint = {
        timestamp: 1000000,
        value: 100,
        sources: ['single-source'],
      };

      const multipleSources: BaseDataPoint = {
        timestamp: 1000000,
        value: 100,
        sources: ['source1', 'source2', 'source3'],
      };

      expect(emptySources.sources).toEqual([]);
      expect(singleSource.sources).toEqual(['single-source']);
      expect(multipleSources.sources).toEqual(['source1', 'source2', 'source3']);
    });

    it('should work in arrays for time-series data', () => {
      const dataPoints: BaseDataPoint[] = [
        { timestamp: 1000000, value: 100, sources: ['source1'] },
        { timestamp: 1001000, value: 200, sources: ['source2'] },
        { timestamp: 1002000, value: 300, sources: ['source3'] },
      ];

      expect(dataPoints).toHaveLength(3);
      expect(dataPoints[0].timestamp).toBe(1000000);
      expect(dataPoints[1].value).toBe(200);
      expect(dataPoints[2].sources).toEqual(['source3']);
    });

    it('should handle complex source identifiers', () => {
      const complexSources: BaseDataPoint = {
        timestamp: 1000000,
        value: 1500,
        sources: [
          'ability:12345',
          'player:123',
          'buff:major_force',
          'set:mothers_sorrow',
          'enchant:weapon_damage',
        ],
      };

      expect(complexSources.sources).toHaveLength(5);
      expect(complexSources.sources).toContain('ability:12345');
      expect(complexSources.sources).toContain('set:mothers_sorrow');
    });
  });

  describe('BaseCalculationTask interface', () => {
    it('should be assignable with required properties', () => {
      const task: BaseCalculationTask = {
        data: { playerId: 456, startTime: 1000000 },
      };

      expect(task.data).toEqual({ playerId: 456, startTime: 1000000 });
    });

    it('should accept various data types', () => {
      const taskWithArrayData: BaseCalculationTask<number[]> = {
        data: [1, 2, 3, 4, 5],
      };

      const taskWithStringData: BaseCalculationTask<string> = {
        data: 'some text data',
      };

      const taskWithNumberData: BaseCalculationTask<number> = {
        data: 42,
      };

      expect(taskWithArrayData.data).toEqual([1, 2, 3, 4, 5]);
      expect(taskWithStringData.data).toBe('some text data');
      expect(taskWithNumberData.data).toBe(42);
    });

    it('should handle complex nested data structures', () => {
      interface ComplexTaskData {
        players: Array<{ id: number; name: string }>;
        settings: {
          duration: number;
          includeHealing: boolean;
          filters: string[];
        };
        metadata: {
          version: string;
          created: Date;
        };
      }

      const complexTask: BaseCalculationTask<ComplexTaskData> = {
        data: {
          players: [
            { id: 1, name: 'Player1' },
            { id: 2, name: 'Player2' },
          ],
          settings: {
            duration: 60000,
            includeHealing: true,
            filters: ['damage', 'healing'],
          },
          metadata: {
            version: '1.0',
            created: new Date(),
          },
        },
      };

      expect(complexTask.data.players).toHaveLength(2);
      expect(complexTask.data.settings.includeHealing).toBe(true);
      expect(complexTask.data.metadata.version).toBe('1.0');
    });

    it('should support optional options property', () => {
      const taskWithOptions: BaseCalculationTask = {
        data: { test: true },
        options: {
          includeCache: false,
          maxProcessingTime: 5000,
          precision: 2,
        },
      };

      const taskWithoutOptions: BaseCalculationTask = {
        data: { test: true },
      };

      expect(taskWithOptions.options).toBeDefined();
      expect(taskWithOptions.options?.includeCache).toBe(false);
      expect(taskWithoutOptions.options).toBeUndefined();
    });

    it('should handle null and undefined data', () => {
      const taskWithNullData: BaseCalculationTask<null> = {
        data: null,
      };

      const taskWithUndefinedData: BaseCalculationTask<undefined> = {
        data: undefined,
      };

      expect(taskWithNullData.data).toBeNull();
      expect(taskWithUndefinedData.data).toBeUndefined();
    });

    it('should support various option types', () => {
      const taskWithVariousOptions: BaseCalculationTask = {
        data: { test: true },
        options: {
          stringOption: 'value',
          numberOption: 42,
          booleanOption: true,
          arrayOption: [1, 2, 3],
          objectOption: { nested: 'value' },
          nullOption: null,
          undefinedOption: undefined,
        },
      };

      expect(taskWithVariousOptions.options?.stringOption).toBe('value');
      expect(taskWithVariousOptions.options?.numberOption).toBe(42);
      expect(taskWithVariousOptions.options?.booleanOption).toBe(true);
      expect(taskWithVariousOptions.options?.arrayOption).toEqual([1, 2, 3]);
      expect(taskWithVariousOptions.options?.objectOption).toEqual({ nested: 'value' });
      expect(taskWithVariousOptions.options?.nullOption).toBeNull();
      expect(taskWithVariousOptions.options?.undefinedOption).toBeUndefined();
    });
  });

  describe('BaseCalculationResult interface', () => {
    it('should be assignable with required properties', () => {
      const result: BaseCalculationResult = {
        success: true,
        data: { totalDamage: 15000, dps: 250 },
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ totalDamage: 15000, dps: 250 });
    });

    it('should handle successful results with various data types', () => {
      const numberResult: BaseCalculationResult<number> = {
        success: true,
        data: 42,
      };

      const stringResult: BaseCalculationResult<string> = {
        success: true,
        data: 'calculation complete',
      };

      const arrayResult: BaseCalculationResult<number[]> = {
        success: true,
        data: [1, 2, 3, 4, 5],
      };

      expect(numberResult.data).toBe(42);
      expect(stringResult.data).toBe('calculation complete');
      expect(arrayResult.data).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle error cases', () => {
      const errorResult: BaseCalculationResult = {
        success: false,
        error: 'Calculation failed due to invalid input',
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.data).toBeUndefined();
      expect(errorResult.error).toBe('Calculation failed due to invalid input');
    });

    it('should handle optional properties', () => {
      const resultWithAllOptionals: BaseCalculationResult = {
        success: true,
        data: { result: 'success' },
        error: undefined,
        processingTimeMs: 1234,
      };

      const minimalResult: BaseCalculationResult = {
        success: false,
      };

      expect(resultWithAllOptionals.processingTimeMs).toBe(1234);
      expect(minimalResult.data).toBeUndefined();
      expect(minimalResult.error).toBeUndefined();
      expect(minimalResult.processingTimeMs).toBeUndefined();
    });

    it('should work with complex result data', () => {
      interface ComplexResultData {
        summary: {
          totalDamage: number;
          totalHealing: number;
          duration: number;
        };
        breakdown: {
          damageByAbility: Record<string, number>;
          healingByAbility: Record<string, number>;
        };
        metrics: {
          dps: number;
          hps: number;
          effectiveness: number;
        };
      }

      const complexResult: BaseCalculationResult<ComplexResultData> = {
        success: true,
        data: {
          summary: {
            totalDamage: 50000,
            totalHealing: 25000,
            duration: 120000,
          },
          breakdown: {
            damageByAbility: {
              'Crystal Fragments': 15000,
              'Force Pulse': 12000,
              'Light Attack': 8000,
            },
            healingByAbility: {
              'Healing Springs': 15000,
              Regeneration: 10000,
            },
          },
          metrics: {
            dps: 416.67,
            hps: 208.33,
            effectiveness: 0.85,
          },
        },
        processingTimeMs: 156,
      };

      expect(complexResult.data?.summary.totalDamage).toBe(50000);
      expect(complexResult.data?.breakdown.damageByAbility['Crystal Fragments']).toBe(15000);
      expect(complexResult.data?.metrics.dps).toBeCloseTo(416.67);
      expect(complexResult.processingTimeMs).toBe(156);
    });

    it('should handle performance tracking', () => {
      const fastResult: BaseCalculationResult = {
        success: true,
        data: { result: 'fast' },
        processingTimeMs: 15,
      };

      const slowResult: BaseCalculationResult = {
        success: true,
        data: { result: 'slow' },
        processingTimeMs: 2500,
      };

      expect(fastResult.processingTimeMs).toBeLessThan(100);
      expect(slowResult.processingTimeMs).toBeGreaterThan(1000);
    });
  });

  describe('type relationships and integration', () => {
    it('should work together in processing workflows', () => {
      // Simulate a workflow
      const dataPoints: BaseDataPoint[] = [
        { timestamp: 1000, value: 100, sources: ['ability:1'] },
        { timestamp: 2000, value: 200, sources: ['ability:2'] },
        { timestamp: 3000, value: 300, sources: ['ability:3'] },
      ];

      const task: BaseCalculationTask<{ dataPoints: BaseDataPoint[] }> = {
        data: { dataPoints },
        options: { aggregationType: 'sum' },
      };

      const sum = task.data.dataPoints.reduce((total, dp) => total + dp.value, 0);

      const result: BaseCalculationResult<{ total: number; average: number; count: number }> = {
        success: true,
        data: {
          total: sum,
          average: sum / dataPoints.length,
          count: dataPoints.length,
        },
        processingTimeMs: 42,
      };

      expect(result.data?.total).toBe(600);
      expect(result.data?.average).toBe(200);
      expect(result.data?.count).toBe(3);
    });

    it('should support generic typing patterns', () => {
      function processTask<TInput, TOutput>(
        task: BaseCalculationTask<TInput>,
        processor: (data: TInput) => TOutput,
      ): BaseCalculationResult<TOutput> {
        const startTime = Date.now();
        try {
          const result = processor(task.data);
          return {
            success: true,
            data: result,
            processingTimeMs: Date.now() - startTime,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTimeMs: Date.now() - startTime,
          };
        }
      }

      const testTask: BaseCalculationTask<number[]> = {
        data: [1, 2, 3, 4, 5],
      };

      const result = processTask(testTask, (numbers) => numbers.reduce((sum, n) => sum + n, 0));

      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should handle error scenarios gracefully', () => {
      const errorTask: BaseCalculationTask<string> = {
        data: 'invalid-data',
      };

      const errorResult: BaseCalculationResult<never> = {
        success: false,
        error: 'Invalid input format',
        processingTimeMs: 5,
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Invalid input format');
      expect(errorResult.data).toBeUndefined();
    });
  });

  describe('type flexibility and extensibility', () => {
    it('should allow extending interfaces for specific use cases', () => {
      interface DamageDataPoint extends BaseDataPoint {
        abilityId: number;
        targetId: number;
      }

      interface DamageCalculationTask extends BaseCalculationTask<{
        playerId: number;
        startTime: number;
        endTime: number;
        dataPoints: DamageDataPoint[];
      }> {
        options?: {
          includeCrits?: boolean;
          excludeDoTs?: boolean;
        };
      }

      const extendedDataPoint: DamageDataPoint = {
        timestamp: 1000000,
        value: 1500,
        sources: ['ability:12345', 'player:123'],
        abilityId: 12345,
        targetId: 67890,
      };

      const extendedTask: DamageCalculationTask = {
        data: {
          playerId: 123,
          startTime: 1000000,
          endTime: 1060000,
          dataPoints: [extendedDataPoint],
        },
        options: {
          includeCrits: true,
          excludeDoTs: false,
        },
      };

      expect(extendedDataPoint.abilityId).toBe(12345);
      expect(extendedTask.data.playerId).toBe(123);
      expect(extendedTask.data.dataPoints[0].value).toBe(1500);
      expect(extendedTask.options?.includeCrits).toBe(true);
    });

    it('should maintain type safety with strict typing', () => {
      // This test ensures TypeScript compile-time type safety
      const typedTask: BaseCalculationTask<{ value: number }> = {
        data: { value: 42 },
      };

      const typedResult: BaseCalculationResult<{ doubled: number }> = {
        success: true,
        data: { doubled: typedTask.data.value * 2 },
      };

      expect(typedResult.data?.doubled).toBe(84);
    });
  });

  describe('real-world usage scenarios', () => {
    it('should support damage calculation workflows', () => {
      const damageDataPoints: BaseDataPoint[] = [
        { timestamp: 1000, value: 1500, sources: ['ability:crystal_fragments'] },
        { timestamp: 2000, value: 800, sources: ['ability:light_attack'] },
        { timestamp: 3000, value: 1200, sources: ['ability:force_pulse'] },
      ];

      const damageTask: BaseCalculationTask<{
        dataPoints: BaseDataPoint[];
        playerId: number;
      }> = {
        data: {
          dataPoints: damageDataPoints,
          playerId: 123,
        },
        options: {
          timeWindow: 60000,
          includePets: false,
        },
      };

      const totalDamage = damageTask.data.dataPoints.reduce((sum, dp) => sum + dp.value, 0);

      const damageResult: BaseCalculationResult<{
        totalDamage: number;
        dps: number;
        topAbility: string;
      }> = {
        success: true,
        data: {
          totalDamage,
          dps: totalDamage / 3, // 3 seconds
          topAbility: 'crystal_fragments',
        },
        processingTimeMs: 45,
      };

      expect(damageResult.data?.totalDamage).toBe(3500);
      expect(damageResult.data?.dps).toBeCloseTo(1166.67);
    });

    it('should support buff tracking workflows', () => {
      const buffDataPoints: BaseDataPoint[] = [
        { timestamp: 1000, value: 1, sources: ['buff:major_force'] },
        { timestamp: 5000, value: 0, sources: ['buff:major_force'] },
        { timestamp: 10000, value: 1, sources: ['buff:major_sorcery'] },
      ];

      const buffTask: BaseCalculationTask<{
        dataPoints: BaseDataPoint[];
        buffIds: string[];
      }> = {
        data: {
          dataPoints: buffDataPoints,
          buffIds: ['major_force', 'major_sorcery'],
        },
      };

      const buffResult: BaseCalculationResult<{
        uptime: Record<string, number>;
        totalUptime: number;
      }> = {
        success: true,
        data: {
          uptime: {
            major_force: 0.4, // 4000ms out of 10000ms
            major_sorcery: 0.1, // 1000ms out of 10000ms
          },
          totalUptime: 0.5,
        },
      };

      expect(buffResult.data?.uptime.major_force).toBe(0.4);
      expect(buffResult.data?.uptime.major_sorcery).toBe(0.1);
    });
  });
});
