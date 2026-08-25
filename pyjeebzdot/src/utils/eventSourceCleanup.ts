/**
 * Shared EventSource cleanup utility for Astro View Transitions.
 * 
 * Usage:
 *   import { registerEventSourceCleanup } from '@/utils/eventSourceCleanup';
 *   
 *   const es = new EventSource('/api/stream');
 *   registerEventSourceCleanup(es);
 */

const eventSources = new Set<EventSource>();

export function registerEventSourceCleanup(es: EventSource): void {
  eventSources.add(es);
  
  // Clean up if the EventSource closes on its own
  es.addEventListener('close', () => {
    eventSources.delete(es);
  });
  
  es.addEventListener('error', () => {
    // Only remove on error if it's a permanent error (not a temporary network issue)
    if (es.readyState === EventSource.CLOSED) {
      eventSources.delete(es);
    }
  });
}

function closeAllEventSources(): void {
  eventSources.forEach((es) => {
    try {
      es.close();
    } catch {
      // Ignore errors during cleanup
    }
  });
  eventSources.clear();
}

// Register the global cleanup handler for Astro View Transitions
if (typeof window !== 'undefined') {
  // Ensure we only register once
  if (!(window as any).__eventSourceCleanupRegistered) {
    window.addEventListener('astro:before-swap', () => {
      closeAllEventSources();
    });
    (window as any).__eventSourceCleanupRegistered = true;
  }
}

export { closeAllEventSources };