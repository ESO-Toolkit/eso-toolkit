// SIMPLIFIED: Remove complex object-creating selectors that cause infinite renders
// Components should use basic selectors directly and compute derived state in useMemo

// This file is kept for backwards compatibility but components should migrate
// to using basic selectors directly for better performance
