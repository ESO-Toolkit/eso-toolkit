# Critical Damage Validation Tool

## Overview

The Critical Damage Validation Tool is a powerful analysis feature that compares our calculated critical damage multipliers against actual damage events from combat logs. This helps verify the accuracy of our critical damage formulas and identifies potential missing or incorrect calculations.

## What It Does

### Core Functionality

1. **Damage Pair Analysis**: The tool identifies pairs of normal and critical hits for the same ability and target, allowing for direct comparison of damage multipliers.

2. **Expected vs Actual Comparison**: For each critical hit, it calculates:
   - Expected critical damage multiplier based on our formulas
   - Actual critical damage multiplier from the combat log
   - Discrepancy percentage between expected and actual values

3. **Statistical Analysis**: Provides comprehensive statistics including:
   - Overall accuracy percentage
   - Confidence intervals
   - Average discrepancies
   - Per-player and per-ability breakdowns

### How It Works

#### Step 1: Data Collection
- Scans all damage events in the fight
- Groups events by ability and target
- Identifies critical hits with corresponding normal hits within a 30-second window

#### Step 2: Critical Damage Calculation
- For each critical hit timestamp, calculates the expected critical damage percentage using our formulas
- Accounts for all known sources of critical damage:
  - Base 50% critical damage
  - Gear bonuses (sets, weapons)
  - Active buffs (Minor/Major Force, Lucent Echoes, etc.)
  - Active debuffs (Minor/Major Brittle)
  - Computed sources (passive abilities, champion points, etc.)

#### Step 3: Comparison and Analysis
- Calculates actual multiplier: `critical_damage / normal_damage`
- Calculates expected multiplier: `(100 + calculated_crit_damage%) / 100`
- Computes discrepancy: `((actual - expected) / expected) * 100`

#### Step 4: Statistical Validation
- Groups results by player and ability
- Calculates accuracy percentages (comparisons within 5% tolerance)
- Computes confidence intervals for reliability assessment
- Identifies systematic vs random errors

## Key Metrics Explained

### Overall Accuracy
**Definition**: Percentage of comparisons where our calculation is within 5% of the actual value.

**Interpretation**:
- **≥95%**: Excellent accuracy - formulas are highly reliable
- **85-94%**: Good accuracy - generally correct with some edge cases
- **<85%**: Poor accuracy - significant issues requiring investigation

### Confidence Level
**Definition**: Statistical confidence in our calculations based on accuracy percentage.

**Categories**:
- **HIGH**: ≥95% accuracy
- **MEDIUM**: 85-94% accuracy  
- **LOW**: <85% accuracy

### Average Discrepancy
**Definition**: Mean absolute difference between calculated and actual values.

**Interpretation**:
- **<5%**: Very good accuracy
- **5-10%**: Acceptable with room for improvement
- **>10%**: Significant systematic errors likely present

### Confidence Interval
**Definition**: Statistical margin of error using 95% confidence level.

**Usage**: Smaller intervals indicate more consistent and reliable results.

## Using the Tool

### Basic Usage

1. **Navigate to Fight**: Open any fight analysis page
2. **Enable Experimental Tabs**: Toggle "Show Experimental Tabs" switch
3. **Select Validation Tab**: Click on the Analytics icon tab
4. **Review Summary**: Check the overview cards for overall metrics
5. **Examine Player Results**: Review individual player accuracy

### Detailed Analysis

1. **Enable Detailed Analysis**: Toggle "Show Detailed Analysis" switch
2. **Select Player**: Click on any player row to see detailed breakdown
3. **Review Per-Ability Results**: See which abilities have accuracy issues
4. **Check Distribution Chart**: Visualize discrepancy patterns
5. **Investigate Outliers**: Look for systematic issues vs random variation

### Tutorial
Click the "Tutorial" button for an interactive guide through all features.

## Understanding Results

### Good Results Indicators
- Overall accuracy >90%
- Most players showing green accuracy chips
- Small confidence intervals (±2-5%)
- Discrepancy distribution centered around 0%

### Concerning Results Indicators
- Overall accuracy <80%
- Many players with red accuracy chips
- Large confidence intervals (±10%+)
- Systematic bias in discrepancy distribution
- Specific abilities consistently showing errors

## Practical Applications

### For Developers
- **Formula Validation**: Verify critical damage calculations are accurate
- **Missing Sources**: Identify unknown critical damage sources
- **Bug Detection**: Find calculation errors in specific scenarios
- **Improvement Tracking**: Monitor accuracy improvements over time

### For Players
- **Build Verification**: Confirm critical damage bonuses are working
- **Gear Validation**: Verify set bonuses and weapon passives
- **Performance Analysis**: Understand actual vs theoretical damage output
- **Bug Reports**: Provide evidence of calculation discrepancies

## Technical Details

### Data Requirements
- Damage events with both normal and critical hits
- Buff/debuff events for active sources
- Combatant info for gear and passive sources
- Player data for talent and champion point info

### Limitations
- Requires sufficient critical/normal hit pairs for statistical validity
- 30-second window for pairing may miss some valid comparisons
- Some rare critical damage sources may not be implemented
- Network delays or combat log timing issues can affect accuracy

### Performance Considerations
- Processing intensive for fights with many damage events
- Results cache for improved user experience
- Background processing to avoid UI blocking

## Future Enhancements

### Planned Features
- **Historical Tracking**: Compare accuracy across multiple fights
- **Source Attribution**: Identify which specific sources have errors
- **Auto-Correction**: Suggest formula adjustments based on results
- **Export Functionality**: Generate detailed reports for analysis

### Research Applications
- **Meta Analysis**: Study critical damage across different content types
- **Class Balance**: Compare accuracy between different player classes
- **Patch Impact**: Track formula accuracy after game updates
- **Community Data**: Aggregate results for improved calculations

## Contributing

If you find consistent discrepancies or have suggestions for improvement:

1. **Report Issues**: Use the bug report system with validation results
2. **Share Data**: Provide fight logs showing systematic errors
3. **Suggest Sources**: Identify missing critical damage sources
4. **Test Changes**: Help validate formula improvements

## Support

For questions about the Critical Damage Validation Tool:
- Review this documentation
- Use the interactive tutorial
- Check the Discord community
- Report bugs through the in-app system

---

*This tool represents ongoing research into ESO's combat mechanics. Results help improve the accuracy of our damage calculations for the entire community.*
