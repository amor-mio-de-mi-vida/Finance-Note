import { App } from 'obsidian';
import { SummaryService } from './SummaryService';
import { format, parseISO } from 'date-fns';
import { Transaction } from '../types/Transaction';
import { PeriodSummary, CurrencySummary } from '../types/PeriodSummary';

interface SummaryQuery {
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    date?: string;
    currencies?: string[];
    showTransactions?: boolean;
    groupBy?: 'category' | 'account' | 'none';
}

export class SummaryQueryService {
    private app: App;
    private summaryService: SummaryService;

    constructor(app: App, summaryService: SummaryService) {
        this.app = app;
        this.summaryService = summaryService;
    }

    async processQuery(query: string): Promise<string> {
        try {
            const queryObj = this.parseQuery(query);
            const date = queryObj.date ? parseISO(queryObj.date) : new Date();
            
            let summary: PeriodSummary | null = null;
            switch (queryObj.type) {
                case 'daily':
                    summary = await this.summaryService.getDailySummary(date);
                    break;
                case 'weekly':
                    summary = await this.summaryService.getWeeklySummary(date);
                    break;
                case 'monthly':
                    summary = await this.summaryService.getMonthlySummary(date);
                    break;
                case 'quarterly':
                    summary = await this.summaryService.getQuarterlySummary(date);
                    break;
                case 'yearly':
                    summary = await this.summaryService.getYearlySummary(date);
                    break;
            }

            if (!summary) return 'No data available';

            return this.generateMarkdown(summary, queryObj);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }

    private parseQuery(query: string): SummaryQuery {
        const lines = query.split('\n').map(line => line.trim()).filter(line => line);
        const queryObj: SummaryQuery = {
            type: 'daily',
            showTransactions: true,
            groupBy: 'none'
        };

        for (const line of lines) {
            const [key, value] = line.split(':').map(part => part.trim());
            switch (key.toLowerCase()) {
                case 'type':
                    if (['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(value)) {
                        queryObj.type = value as SummaryQuery['type'];
                    }
                    break;
                case 'date':
                    queryObj.date = value;
                    break;
                case 'currencies':
                    queryObj.currencies = value.split(',').map(c => c.trim());
                    break;
                case 'showtransactions':
                    queryObj.showTransactions = value.toLowerCase() === 'true';
                    break;
                case 'groupby':
                    if (['category', 'account', 'none'].includes(value)) {
                        queryObj.groupBy = value as SummaryQuery['groupBy'];
                    }
                    break;
            }
        }

        return queryObj;
    }

    private generateMarkdown(summary: PeriodSummary, query: SummaryQuery): string {
        let markdown = `# Finance Summary: ${summary.period}\n\n`;

        // 过滤货币
        const filteredSummaries = query.currencies 
            ? summary.summaries.filter((s: CurrencySummary) => query.currencies?.includes(s.currency))
            : summary.summaries;

        if (query.groupBy === 'none') {
            // 按货币分组显示
            filteredSummaries.forEach((currencySummary: CurrencySummary) => {
                markdown += this.generateCurrencySummary(currencySummary, query.showTransactions ?? true);
            });
        } else {
            // 按类别或账户分组显示
            filteredSummaries.forEach((currencySummary: CurrencySummary) => {
                markdown += this.generateGroupedSummary(
                    currencySummary, 
                    query.groupBy ?? 'none', 
                    query.showTransactions ?? true
                );
            });
        }

        return markdown;
    }

    private generateCurrencySummary(summary: CurrencySummary, showTransactions: boolean): string {
        let markdown = `## ${summary.currency}\n\n`;
        markdown += `### Overview\n`;
        markdown += `- Income: ${summary.totalIncome.toFixed(2)} ${summary.currency}\n`;
        markdown += `- Expense: ${summary.totalExpense.toFixed(2)} ${summary.currency}\n`;
        markdown += `- Net: ${summary.netAmount.toFixed(2)} ${summary.currency}\n\n`;

        if (showTransactions && summary.transactions.length > 0) {
            markdown += `### Transactions\n\n`;
            markdown += `| Date | Description | Amount | Type |\n`;
            markdown += `|------|-------------|--------|------|\n`;

            summary.transactions.forEach((transaction: Transaction) => {
                const date = format(transaction.date, 'yyyy-MM-dd');
                const amount = transaction.amount.toFixed(2);
                const type = transaction.type === 'income' ? '📈 Income' : '📉 Expense';
                markdown += `| ${date} | ${transaction.description || ''} | ${amount} | ${type} |\n`;
            });
        }

        markdown += '\n';
        return markdown;
    }

    private generateGroupedSummary(
        summary: CurrencySummary, 
        groupBy: 'category' | 'account' | 'none', 
        showTransactions: boolean
    ): string {
        if (groupBy === 'none') {
            return this.generateCurrencySummary(summary, showTransactions);
        }

        let markdown = `## ${summary.currency}\n\n`;
        markdown += `### Overview\n`;
        markdown += `- Income: ${summary.totalIncome.toFixed(2)} ${summary.currency}\n`;
        markdown += `- Expense: ${summary.totalExpense.toFixed(2)} ${summary.currency}\n`;
        markdown += `- Net: ${summary.netAmount.toFixed(2)} ${summary.currency}\n\n`;

        // 按类别或账户分组
        const groups = new Map<string, Transaction[]>();
        summary.transactions.forEach((transaction: Transaction) => {
            const key = groupBy === 'category' ? transaction.category : transaction.account;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(transaction);
        });

        // 显示分组统计
        markdown += `### ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} Summary\n\n`;
        markdown += `| ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} | Income | Expense | Net |\n`;
        markdown += `|------|--------|---------|-----|\n`;

        groups.forEach((transactions: Transaction[], key: string) => {
            const income = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            const expense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            const net = income - expense;
            markdown += `| ${key} | ${income.toFixed(2)} | ${expense.toFixed(2)} | ${net.toFixed(2)} |\n`;
        });

        markdown += '\n';

        // 显示详细交易
        if (showTransactions) {
            groups.forEach((transactions: Transaction[], key: string) => {
                markdown += `#### ${key}\n\n`;
                markdown += `| Date | Description | Amount | Type |\n`;
                markdown += `|------|-------------|--------|------|\n`;

                transactions.forEach((transaction: Transaction) => {
                    const date = format(transaction.date, 'yyyy-MM-dd');
                    const amount = transaction.amount.toFixed(2);
                    const type = transaction.type === 'income' ? '📈 Income' : '📉 Expense';
                    markdown += `| ${date} | ${transaction.description || ''} | ${amount} | ${type} |\n`;
                });

                markdown += '\n';
            });
        }

        return markdown;
    }
} 