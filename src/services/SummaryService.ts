import { App } from 'obsidian';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { FinanceSettings } from '../settings';
import { Transaction } from '../types/Transaction';
import { TransactionService } from './TransactionService';

interface SummaryPeriod {
    start: Date;
    end: Date;
}

interface CurrencySummary {
    currency: string;
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
    transactions: Transaction[];
}

interface PeriodSummary {
    period: string;
    summaries: CurrencySummary[];
    markdown: string;
}

export class SummaryService {
    private app: App;
    private settings: FinanceSettings;
    private transactionService: TransactionService;

    constructor(app: App, settings: FinanceSettings, transactionService: TransactionService) {
        this.app = app;
        this.settings = settings;
        this.transactionService = transactionService;
    }

    async getDailySummary(date: Date): Promise<PeriodSummary> {
        const period: SummaryPeriod = {
            start: startOfDay(date),
            end: endOfDay(date)
        };
        return this.generateSummary(period, 'daily');
    }

    async getWeeklySummary(date: Date): Promise<PeriodSummary> {
        const period: SummaryPeriod = {
            start: startOfWeek(date),
            end: endOfWeek(date)
        };
        return this.generateSummary(period, 'weekly');
    }

    async getMonthlySummary(date: Date): Promise<PeriodSummary> {
        const period: SummaryPeriod = {
            start: startOfMonth(date),
            end: endOfMonth(date)
        };
        return this.generateSummary(period, 'monthly');
    }

    async getQuarterlySummary(date: Date): Promise<PeriodSummary> {
        const period: SummaryPeriod = {
            start: startOfQuarter(date),
            end: endOfQuarter(date)
        };
        return this.generateSummary(period, 'quarterly');
    }

    async getYearlySummary(date: Date): Promise<PeriodSummary> {
        const period: SummaryPeriod = {
            start: startOfYear(date),
            end: endOfYear(date)
        };
        return this.generateSummary(period, 'yearly');
    }

    private async generateSummary(period: SummaryPeriod, type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): Promise<PeriodSummary> {
        const transactions = await this.transactionService.getTransactions({
            startDate: period.start,
            endDate: period.end
        });

        // 按货币分组
        const currencyGroups = new Map<string, Transaction[]>();
        transactions.forEach(transaction => {
            const currency = transaction.currency;
            if (!currencyGroups.has(currency)) {
                currencyGroups.set(currency, []);
            }
            currencyGroups.get(currency)!.push(transaction);
        });

        // 为每种货币生成摘要
        const summaries: CurrencySummary[] = [];
        currencyGroups.forEach((transactions, currency) => {
            const summary = this.calculateCurrencySummary(transactions, currency);
            summaries.push(summary);
        });

        // 生成期间标签
        const periodLabel = this.generatePeriodLabel(period, type);

        // 生成 Markdown 格式的摘要
        const markdown = this.generateMarkdownSummary(periodLabel, summaries);

        return {
            period: periodLabel,
            summaries,
            markdown
        };
    }

    private calculateCurrencySummary(transactions: Transaction[], currency: string): CurrencySummary {
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            currency,
            totalIncome,
            totalExpense,
            netAmount: totalIncome - totalExpense,
            transactions
        };
    }

    private generatePeriodLabel(period: SummaryPeriod, type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
        switch (type) {
            case 'daily':
                return format(period.start, 'yyyy-MM-dd');
            case 'weekly':
                return `${format(period.start, 'yyyy-MM-dd')} to ${format(period.end, 'yyyy-MM-dd')}`;
            case 'monthly':
                return format(period.start, 'yyyy-MM');
            case 'quarterly':
                return `${format(period.start, 'yyyy-MM')} to ${format(period.end, 'yyyy-MM')}`;
            case 'yearly':
                return format(period.start, 'yyyy');
            default:
                return '';
        }
    }

    private generateMarkdownSummary(periodLabel: string, summaries: CurrencySummary[]): string {
        let markdown = `# Finance Summary: ${periodLabel}\n\n`;

        summaries.forEach(summary => {
            markdown += `## ${summary.currency}\n\n`;
            markdown += `### Overview\n`;
            markdown += `- Income: ${summary.totalIncome.toFixed(2)} ${summary.currency}\n`;
            markdown += `- Expense: ${summary.totalExpense.toFixed(2)} ${summary.currency}\n`;
            markdown += `- Net: ${summary.netAmount.toFixed(2)} ${summary.currency}\n\n`;

            if (summary.transactions.length > 0) {
                markdown += `### Transactions\n\n`;
                markdown += `| Date | Description | Amount | Type |\n`;
                markdown += `|------|-------------|--------|------|\n`;

                summary.transactions.forEach(transaction => {
                    const date = format(transaction.date, 'yyyy-MM-dd');
                    const amount = transaction.amount.toFixed(2);
                    const type = transaction.type === 'income' ? '📈 Income' : '📉 Expense';
                    markdown += `| ${date} | ${transaction.description} | ${amount} | ${type} |\n`;
                });
            }

            markdown += '\n';
        });

        return markdown;
    }
} 