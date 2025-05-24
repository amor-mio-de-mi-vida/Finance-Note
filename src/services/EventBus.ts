type EventCallback = () => void;

export class EventBus {
    private static instance: EventBus;
    private listeners: Map<string, EventCallback[]> = new Map();

    private constructor() {}

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    subscribe(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    unsubscribe(event: string, callback: EventCallback): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event: string): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback());
        }
    }
}

export const EVENT_TYPES = {
    TRANSACTION_CHANGED: 'transaction-changed',
    BUDGET_CHANGED: 'budget-changed',
    RECURRING_TRANSACTION_CHANGED: 'recurring-transaction-changed'
}; 