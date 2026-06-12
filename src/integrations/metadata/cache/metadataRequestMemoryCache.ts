import { clearAppleBooksRequestMemoryCache } from "../appleBooksApi";
import { clearAudibleRequestMemoryCache } from "../audibleApi";
import { clearGoogleBooksRequestMemoryCache } from "../googleBooksApi";
import { clearOpenLibraryRequestMemoryCache } from "../openLibraryApi";

/**
 * Purpose: Clear provider request responses held only in the current browser
 * session.
 *
 * @returns Nothing. Later provider requests must use persistent storage or make
 * network calls again.
 */
export function clearMetadataRequestMemoryCaches(): void {
  clearAudibleRequestMemoryCache();
  clearAppleBooksRequestMemoryCache();
  clearGoogleBooksRequestMemoryCache();
  clearOpenLibraryRequestMemoryCache();
}
