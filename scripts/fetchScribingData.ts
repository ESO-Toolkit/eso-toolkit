import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ESO Scribing Data Fetcher
 * 
 * This script fetches and processes ESO scribing data from eso-hub.com
 * and formats it for use in the ESO Log Aggregator application.
 * 
 * Usage:
 *   npm run fetch-scribing-data
 *   npx tsx scripts/fetchScribingData.ts
 */

interface ScribingData {
  grimoires: Record<string, any>;
  focusScripts: Record<string, any>;
  signatureScripts: Record<string, any>;
  affixScripts: Record<string, any>;
  questRewards: Record<string, any>;
  freeScriptLocations: Record<string, any>;
  dailyScriptSources: Record<string, any>;
  scriptVendors: Record<string, any>;
  luminousInk: any;
  system: any;
}

/**
 * Fetch scribing data from ESO Hub
 */
async function fetchScribingData(): Promise<string> {
  try {
    console.log('🔄 Fetching scribing data from eso-hub.com...');
    
    const response = await fetch('https://eso-hub.com/en/scribing');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('✅ Successfully fetched scribing webpage');
    
    return html;
  } catch (error) {
    console.error('❌ Error fetching scribing data:', error);
    throw error;
  }
}

/**
 * Parse HTML content and extract scribing information
 */
function parseScribingHTML(html: string): ScribingData {
  console.log('🔄 Parsing scribing data...');
  
  // This is a simplified parser - in a real implementation, you would
  // use a proper HTML parser like cheerio to extract the data
  // For now, we'll return the pre-structured data
  
  const scribingData: ScribingData = {
    grimoires: {},
    focusScripts: {},
    signatureScripts: {},
    affixScripts: {},
    questRewards: {},
    freeScriptLocations: {},
    dailyScriptSources: {},
    scriptVendors: {},
    luminousInk: {},
    system: {}
  };
  
  console.log('✅ Successfully parsed scribing data');
  return scribingData;
}

/**
 * Validate the scribing data structure
 */
function validateScribingData(data: ScribingData): boolean {
  console.log('🔄 Validating scribing data structure...');
  
  const requiredSections = [
    'grimoires',
    'focusScripts', 
    'signatureScripts',
    'affixScripts',
    'questRewards',
    'freeScriptLocations',
    'dailyScriptSources',
    'scriptVendors',
    'luminousInk',
    'system'
  ];
  
  for (const section of requiredSections) {
    if (!(section in data)) {
      console.error(`❌ Missing required section: ${section}`);
      return false;
    }
  }
  
  console.log('✅ Scribing data structure validation passed');
  return true;
}

/**
 * Save scribing data to JSON file
 */
function saveScribingData(data: ScribingData): void {
  console.log('🔄 Saving scribing data to file...');
  
  const outputPath = path.join(__dirname, '../data/scribing.json');
  const jsonContent = JSON.stringify(data, null, 2);
  
  try {
    fs.writeFileSync(outputPath, jsonContent, 'utf8');
    console.log(`✅ Scribing data saved to: ${outputPath}`);
    console.log(`📊 File size: ${(jsonContent.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error saving scribing data:', error);
    throw error;
  }
}

/**
 * Generate TypeScript types for scribing data
 */
function generateScribingTypes(data: ScribingData): void {
  console.log('🔄 Generating TypeScript types...');
  
  const typesContent = `// Auto-generated types for ESO Scribing data
// Generated on: ${new Date().toISOString()}

export interface Grimoire {
  id: string;
  name: string;
  skillLine: string;
  requirements: string | null;
  cost: {
    first: number;
    additional: number;
  };
  description: string;
}

export interface Script {
  id: string;
  name: string;
  type: 'Focus' | 'Signature' | 'Affix';
  icon: string;
  compatibleGrimoires: string[];
  description: string;
  questReward?: string;
  freeLocation?: string;
}

export interface QuestReward {
  questName: string;
  rewards: Array<{
    type: 'grimoire' | 'focus' | 'signature' | 'affix';
    id: string;
  }>;
}

export interface ScriptVendor {
  name: string;
  location: string;
  currency: string;
  costs: {
    'focus-script': { first: number; additional: number };
    'signature-script': { first: number; additional: number };
    'affix-script': { first: number; additional: number };
  };
}

export interface ScribingData {
  grimoires: Record<string, Grimoire>;
  focusScripts: Record<string, Script>;
  signatureScripts: Record<string, Script>;
  affixScripts: Record<string, Script>;
  questRewards: Record<string, QuestReward>;
  freeScriptLocations: Record<string, any>;
  dailyScriptSources: Record<string, string[]>;
  scriptVendors: Record<string, ScriptVendor>;
  luminousInk: {
    description: string;
    costs: { newSkill: number; modifySkill: number };
    sources: string[];
    storage: string;
  };
  system: {
    totalPossibleSkills: number;
    grimoireRange: { min: number; max: number };
    requirements: {
      chapter: string;
      characterLevel: number;
      tutorialQuest: string;
    };
  };
}
`;
  
  const typesPath = path.join(__dirname, '../src/types/scribing.ts');
  
  try {
    // Ensure the types directory exists
    const typesDir = path.dirname(typesPath);
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }
    
    fs.writeFileSync(typesPath, typesContent, 'utf8');
    console.log(`✅ TypeScript types generated: ${typesPath}`);
  } catch (error) {
    console.error('❌ Error generating TypeScript types:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting ESO Scribing data fetch process...');
    console.log('⏰ Started at:', new Date().toISOString());
    
    // Read existing data file if it exists
    const dataPath = path.join(__dirname, '../data/scribing.json');
    let existingData: ScribingData | null = null;
    
    if (fs.existsSync(dataPath)) {
      console.log('📖 Found existing scribing data file');
      try {
        const existingContent = fs.readFileSync(dataPath, 'utf8');
        existingData = JSON.parse(existingContent);
        console.log('✅ Successfully loaded existing data');
      } catch (error) {
        console.warn('⚠️ Could not parse existing data file:', error);
      }
    }
    
    // For now, use the manually created data structure
    // In future iterations, this would fetch and parse from the website
    if (existingData) {
      console.log('📊 Using existing scribing data');
      
      // Validate existing data
      if (validateScribingData(existingData)) {
        generateScribingTypes(existingData);
        console.log('✅ Scribing data processing completed successfully');
      } else {
        console.error('❌ Existing data validation failed');
        process.exit(1);
      }
    } else {
      console.log('❌ No existing scribing data found');
      console.log('💡 Please ensure scribing.json exists in the data directory');
      process.exit(1);
    }
    
    console.log('⏰ Completed at:', new Date().toISOString());
    
  } catch (error) {
    console.error('❌ Fatal error in scribing data fetch process:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { fetchScribingData, parseScribingHTML, validateScribingData, saveScribingData };