# Fight 16 Analysis Summary

## Fight Information

- **Name:** Lord Falgravn
- **Difficulty:** 122
- **Duration:** 7 minutes 52 seconds
- **Boss Percentage:** 0.01% (fight ended with boss nearly at full health)
- **Report:** baJFfYC8trPhHMQp (Kyne's Aegis)

## Fight Bounding Box

The official fight bounding box defines the arena boundaries:

- **Min X:** 2,163 | **Max X:** 9,013
- **Min Y:** 1,156 | **Max Y:** 8,121
- **Width:** 6,850 units
- **Height:** 6,965 units
- **Center:** (5,588, 4,638.5)

### 3D Coordinate System (for Combat Arena)

- **3D Min:** (-3.07, 0, -4.25)
- **3D Max:** (3.78, 0, 2.71)
- **3D Width:** 6.85 units
- **3D Height:** 6.96 units

## Player Movement Analysis

Analysis of 55,687 coordinate points from damage, healing, and resource events:

### Player Coordinate Ranges

- **X Range:** 2,940 to 8,549 (width: 5,609 units)
- **Y Range:** 2,348 to 8,121 (height: 5,773 units)

### 3D Player Movement Area

- **3D Min:** (-2.29, 0, -3.06)
- **3D Max:** (3.31, 0, 2.71)
- **3D Width:** 5.61 units
- **3D Height:** 5.77 units

## Bounds Check Results

✅ **SUCCESS:** All player coordinates are within the fight bounding box

- X coordinates within bounds: ✅ YES
- Y coordinates within bounds: ✅ YES

## Area Coverage

- **Bounding box area:** 47,710,250 square units
- **Player movement area:** 32,380,757 square units
- **Coverage:** 67.9% of the bounding box area was utilized by players

## Data Sources

The analysis processed coordinate data from:

- **Damage events:** 20,000 coordinate points
- **Healing events:** 17,575 coordinate points
- **Resource events:** 18,112 coordinate points

## Key Insights

1. Players stayed well within the fight boundaries
2. Players utilized about 68% of the available arena space
3. The combat was concentrated in the center-east portion of the arena
4. The 3D arena dimensions show a roughly square combat area (5.6 x 5.8 units)
5. Player movement patterns were consistent across different event types
