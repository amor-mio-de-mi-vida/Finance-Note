import { Transaction } from './Transaction';

export interface CurrencySummary {
    currency: string;
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
    transactions: Transaction[];
}

export interface PeriodSummary {
    period: string;
    summaries: CurrencySummary[];
} 