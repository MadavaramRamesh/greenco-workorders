/**
 * Lightweight in-memory event bus for notifying components and hooks
 * when local database writes, settings updates, or sync operations occur.
 * No external global store library is used.
 */

export type DataEventType = 'work_orders' | 'outbox' | 'settings' | 'sync' | 'all';

export type DataEventListener = (type: DataEventType) => void;

class DataEventEmitter {
  private listeners: Set<DataEventListener> = new Set();

  /**
   * Subscribe a listener to data events.
   * Returns an unsubscribe function.
   */
  subscribe(listener: DataEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all registered listeners that data has changed.
   */
  emit(type: DataEventType = 'all'): void {
    this.listeners.forEach((listener) => {
      try {
        listener(type);
      } catch (err) {
        console.error('[DataEventEmitter] Listener error:', err);
      }
    });
  }
}

export const dataEvents = new DataEventEmitter();
