/**
 * Advanced Skill Filtering and Search Utilities
 * Provides filtering by type, resource, category, and search
 */

import { getAllActiveSkills, preloadSkillData } from '../data/skillLineSkills';
import type { SkillData } from '../../../data/types/skill-line-types';

export type SkillType = 'all' | 'active' | 'ultimate' | 'passive';
export type ResourceType = 'all' | 'magicka' | 'stamina' | 'health' | 'ultimate';

export interface SkillFilters {
  type?: SkillType;
  resourceType?: ResourceType;
  category?: string;
  query?: string;
  limit?: number;
}

// Export as SkillFilterValues for component use
export type SkillFilterValues = Required<Pick<SkillFilters, 'type' | 'resourceType'>> &
  Pick<SkillFilters, 'category'>;

// Initialize cache on module load
preloadSkillData();

/**
 * Get all unique skill line categories
 */
export function getSkillLineCategories(): string[] {
  const allSkills = getAllActiveSkills();
  if (!allSkills) return [];

  const categories = new Set<string>();
  for (const skill of allSkills) {
    if (skill.category) {
      categories.add(skill.category);
    }
  }
  return Array.from(categories).sort();
}

/**
 * Determine resource type based on skill data
 * This is a heuristic - in a full implementation, you'd have this data in the skill itself
 */
export function getResourceType(skill: SkillData): ResourceType {
  if (skill.isUltimate || skill.type === 'ultimate') return 'ultimate';

  // Heuristic: check skill name/category for resource type hints
  const name = skill.name.toLowerCase();
  const category = skill.category?.toLowerCase() || '';

  // Stamina indicators
  if (
    category.includes('dual wield') ||
    category.includes('two handed') ||
    category.includes('bow') ||
    category.includes('medium armor') ||
    category.includes('assault') ||
    name.includes('strike') ||
    name.includes('slash') ||
    name.includes('swing') ||
    name.includes('carve') ||
    name.includes('whirlwind')
  ) {
    return 'stamina';
  }

  // Magicka indicators (default for most skills)
  if (
    category.includes('destruction') ||
    category.includes('restoration') ||
    category.includes('light armor') ||
    category.includes('mages') ||
    category.includes('psijic') ||
    category.includes('support') ||
    name.includes('aura') ||
    name.includes('ward') ||
    name.includes('curse') ||
    name.includes('summon')
  ) {
    return 'magicka';
  }

  // Default to magicka for active skills
  return 'magicka';
}

/**
 * Filter skills by type (active, ultimate, passive)
 */
function filterByType(skills: SkillData[], type: SkillType): SkillData[] {
  if (type === 'all') return skills;

  if (type === 'ultimate') {
    return skills.filter((s) => s.isUltimate || s.type === 'ultimate');
  }

  return skills.filter((s) => s.type === type);
}

/**
 * Filter skills by resource type
 */
function filterByResourceType(skills: SkillData[], resourceType: ResourceType): SkillData[] {
  if (resourceType === 'all') return skills;

  return skills.filter((s) => getResourceType(s) === resourceType);
}

/**
 * Filter skills by category (skill line)
 */
function filterByCategory(skills: SkillData[], category: string | undefined): SkillData[] {
  if (!category) return skills;
  return skills.filter((s) => s.category === category);
}

/**
 * Search skills by query string
 */
function searchByQuery(skills: SkillData[], query: string | undefined): SkillData[] {
  if (!query || query.trim().length < 2) return skills;

  const lowerQuery = query.toLowerCase().trim();
  return skills.filter((s) =>
    s.name.toLowerCase().includes(lowerQuery) ||
    s.category?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Main filter function combining all filters
 */
export function filterSkills(filters: SkillFilters): SkillData[] {
  const allSkills = getAllActiveSkills();
  if (!allSkills) return [];

  let results = [...allSkills];

  // Apply filters in order
  results = filterByType(results, filters.type || 'all');
  results = filterByResourceType(results, filters.resourceType || 'all');
  results = filterByCategory(results, filters.category);
  results = searchByQuery(results, filters.query);

  // Apply limit
  if (filters.limit && results.length > filters.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}

/**
 * Get paginated results
 */
export function getPaginatedSkills(
  filters: SkillFilters,
  page: number,
  pageSize: number
): { skills: SkillData[]; total: number; hasMore: boolean } {
  const allResults = filterSkills({ ...filters, limit: undefined });
  const total = allResults.length;
  const start = page * pageSize;
  const skills = allResults.slice(start, start + pageSize);
  const hasMore = start + pageSize < total;

  return { skills, total, hasMore };
}
