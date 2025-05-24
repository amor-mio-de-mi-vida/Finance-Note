export interface RecurringTransaction {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    account: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    currency: string;
} 