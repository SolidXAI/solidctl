type EventHandler<T = any> = (payload: T) => void;

class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on<T = any>(event: string, handler: EventHandler<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
    return () => this.off(event, handler as EventHandler);
  }

  off<T = any>(event: string, handler: EventHandler<T>) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler as EventHandler);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<T = any>(event: string, payload?: T) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload as T);
      } catch {
        // swallow to avoid breaking other listeners
      }
    }
  }
}

export const eventBus = new EventBus();

export const AppEvents = {
  SessionUpdated: "session:updated",
  SessionCleared: "session:cleared",
  GlobalError: "error:global",
} as const;
