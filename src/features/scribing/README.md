# ESO Scribing Feature - New Architecture

This document describes the improved architecture for the ESO Scribing feature, implementing domain-driven design principles.

## Architecture Overview

The new architecture follows a layered approach with clear separation of concerns:

```
src/features/scribing-new/
├── core/                    # Core domain logic
│   ├── entities/           # Domain entities
│   ├── repositories/       # Data access interfaces
│   └── services/          # Business logic services
├── infrastructure/         # External data access
│   ├── data/              # Data access implementations
│   └── mappers/           # Data transformation utilities
├── application/           # Use cases and orchestration
│   ├── detectors/         # Detection algorithms
│   ├── services/          # Application services
│   └── simulators/        # Simulation engines
├── presentation/          # UI layer
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   └── pages/            # Page components
├── shared/               # Shared utilities
│   ├── types/            # TypeScript definitions
│   ├── schemas/          # Validation schemas
│   └── constants/        # Shared constants
└── __tests__/           # Consolidated test directory
```

## Key Improvements

### 1. Domain-Driven Design

- **Core entities** represent business concepts (Grimoire, Script, ScribingCombination)
- **Clear boundaries** between layers with defined interfaces
- **Business logic** centralized in services, not scattered in utilities

### 2. Dependency Injection

- **Repository pattern** for data access abstraction
- **Service interfaces** for testability and flexibility
- **Strategy pattern** for detection algorithms

### 3. Clean Architecture Principles

- **Separation of concerns** between layers
- **Dependency inversion** - high-level modules don't depend on low-level details
- **Single responsibility** - each class/module has one reason to change

### 4. Improved Testing

- **Isolated business logic** easier to unit test
- **Mock-friendly interfaces** for all external dependencies
- **Consolidated test organization** by type (unit, integration, fixtures)

## Core Components

### Data Layer

#### IScribingDataRepository

Interface for data access operations:

```typescript
interface IScribingDataRepository {
  loadScribingData(): Promise<ScribingData>;
  getGrimoire(id: string): Promise<Grimoire | null>;
  validateCombination(...): Promise<boolean>;
}
```

#### JsonScribingDataRepository

JSON file-based implementation with caching and validation.

### Business Logic Layer

#### AbilityMappingService

Core service for mapping ability IDs to scribing components:

```typescript
class AbilityMappingService {
  async initialize(): Promise<void>;
  getScribingComponent(abilityId: number): AbilityScribingMapping[];
  isScribingAbility(abilityId: number): boolean;
}
```

#### ScribingDetectionService

Orchestrates multiple detection strategies:

```typescript
class ScribingDetectionService {
  async detectScribingCombinations(context): Promise<ScribingDetectionResult>;
  registerStrategy(strategy: IDetectionStrategy): void;
}
```

#### ScribingSimulatorService

Handles skill simulation and validation:

```typescript
class ScribingSimulatorService {
  async simulate(request: ScribingSimulationRequest): Promise<ScribingSimulationResponse>;
  async validateCombination(...): Promise<boolean>;
}
```

### Detection Algorithms

#### Strategy Pattern Implementation

Each detection algorithm implements `IDetectionStrategy`:

- `GrimoireDetectionStrategy` - Detects base grimoires from cast patterns
- `FocusScriptDetectionStrategy` - Detects focus scripts from transformations
- Extensible for signature and affix detection

### Presentation Layer

#### Smart/Dumb Component Pattern

- **ScribingSimulator** - Smart component with business logic
- **ScribingSimulatorComponents** - Dumb presentational components
- **useScribingSimulation** - Custom hook for state management

## Type System

### Consolidated Types

- **entities.ts** - Core domain entities with readonly properties
- **dtos.ts** - Data transfer objects for external interfaces
- **schemas.ts** - Zod validation schemas with runtime checking

### Runtime Validation

All external data validated using Zod schemas:

```typescript
const result = validateScribingData(rawData);
const safeResult = safeParseScribingData(untrustedData);
```

## Usage Examples

### Basic Simulation

```typescript
const repository = new JsonScribingDataRepository();
const simulator = new ScribingSimulatorService(repository);

const result = await simulator.simulate({
  grimoireId: 'trample',
  focusScriptId: 'physical-damage',
});
```

### Detection Service

```typescript
const repository = new JsonScribingDataRepository();
const mappingService = new AbilityMappingService(repository);
await mappingService.initialize();

const detectionService = new ScribingDetectionService(mappingService);
const results = await detectionService.detectScribingCombinations(context);
```

### React Component

```typescript
import { ScribingSimulator } from '@features/scribing-new';

function MyPage() {
  return <ScribingSimulator defaultGrimoire="trample" autoSimulate />;
}
```

## Migration Guide

### From Old Architecture

1. Replace imports from `@features/scribing` with `@features/scribing-new`
2. Update component usage - new props interface
3. Replace utility function calls with service method calls
4. Update test mocks to use new interfaces

### Gradual Migration

The new architecture can be introduced gradually:

1. Start with new components for new features
2. Migrate existing components one by one
3. Keep old architecture until migration complete
4. Remove old code after full migration

## Performance Considerations

### Caching Strategy

- Repository caches loaded data
- Service instances can be reused
- Validation results cached for repeated calls

### Lazy Loading

- Components only load when needed
- Detection strategies registered on-demand
- Heavy calculations deferred until required

## Testing Strategy

### Unit Tests

- Service methods isolated with mocked repositories
- Pure functions tested independently
- Validation schemas tested with edge cases

### Integration Tests

- Full service integration with real data
- Component testing with mock services
- End-to-end detection workflows

### Performance Tests

- Large dataset loading performance
- Detection algorithm efficiency
- Memory usage optimization

## Future Enhancements

### Extensibility Points

- Custom detection strategies
- Additional data sources (API, database)
- Plugin architecture for custom script types

### Monitoring & Analytics

- Detection accuracy metrics
- Performance monitoring
- Usage analytics

### Advanced Features

- Machine learning detection improvement
- Real-time detection updates
- Collaborative configuration sharing
