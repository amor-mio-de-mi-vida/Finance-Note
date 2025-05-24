export interface Budget {
    id: string;
    amount: number;
    category: string;
    period: 'monthly' | 'yearly';
    description?: string;
    status?: 'active' | 'completed' | 'cancelled';
    currency: string;
} 