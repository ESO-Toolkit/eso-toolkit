// Smaller chunk size prevents Sentry from flagging oversized responses
export const EVENT_PAGE_LIMIT = 20000;

// Default number of cached report/fight entries to retain per event slice before evicting oldest
export const EVENT_CACHE_MAX_ENTRIES = 6;
