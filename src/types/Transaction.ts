export interface Transaction {
    id: string;
    date: Date;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    account: string;
    description?: string;
    currency: string;
} 