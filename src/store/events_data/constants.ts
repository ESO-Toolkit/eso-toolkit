// Smaller chunk size prevents Rollbar from flagging oversized responses
export const EVENT_PAGE_LIMIT = 20000;

// Keep interval-heavy event streams from saturating the browser/network and set
// hard ceilings for malformed or unexpectedly large pagination responses.
export const EVENT_QUERY_MAX_CONCURRENCY = 4;
export const EVENT_MAX_PAGES_PER_STREAM = 100;
export const EVENT_MAX_EVENTS_PER_STREAM = 500000;
export const EVENT_MAX_INTERVALS_PER_STREAM = 240;

// Default number of cached report/fight entries to retain per event slice before evicting oldest
export const EVENT_CACHE_MAX_ENTRIES = 6;
