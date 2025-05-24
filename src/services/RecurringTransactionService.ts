import { App, TFile } from 'obsidian';
import { format, getYear } from 'date-fns';
import { FinanceSettings } from '../settings';
import { RecurringTransaction } from '../types/RecurringTransaction';
import { EventBus, EVENT_TYPES } from './EventBus';

interface RecurringTransactionQuery {
    year?: number;
}

export class RecurringTransactionService {
    private app: App;
    private settings: FinanceSettings;
    private recurringTransactions: RecurringTransaction[] = [];
    private eventBus: EventBus;

    constructor(app: App, settings: FinanceSettings) {
        this.app = app;
        this.settings = settings;
        this.eventBus = EventBus.getInstance();
        this.loadRecurringTransactions();
    }

    private async loadRecurringTransactions() {
        try {
            const currentYear = new Date().getFullYear();
            const file = await this.getOrCreateFinanceFile(currentYear);
            const content = await this.app.vault.read(file);
            this.recurringTransactions = this.parseRecurringTransactionsFromContent(content);
        } catch (error) {
            console.error('Failed to load recurring transactions:', error);
            this.recurringTransactions = [];
        }
    }

    private async getOrCreateFinanceFile(year: number): Promise<TFile> {
        const { vault } = this.app;
        const yearPath = `${this.settings.financeFilePath}/${year}`;
        const filePath = `${yearPath}/recurrent transactions.finance.md`;

        try {
            // 确保年份目录存在
            await this.ensureDirectoryExists(yearPath);
            
            const file = vault.getAbstractFileByPath(filePath);
            if (file instanceof TFile) {
                return file;
            }
        } catch (error) {
            console.error('Error getting finance file:', error);
        }

        // 如果文件不存在，创建新文件
        const content = this.getInitialContent(year);
        return await vault.create(filePath, content);
    }

    private async ensureDirectoryExists(path: string) {
        const { vault } = this.app;
        try {
            await vault.createFolder(path);
        } catch (error) {
            // 目录可能已存在，忽略错误
        }
    }

    private getInitialContent(year: number): string {
        return `# ${year} Recurring Transactions\n\n`;
    }

    private parseRecurringTransactionsFromContent(content: string): RecurringTransaction[] {
        const transactions: RecurringTransaction[] = [];
        const lines = content.split('\n');
        let currentTransaction: Partial<RecurringTransaction> = {};

        for (const line of lines) {
            if (line.startsWith('## ')) {
                if (Object.keys(currentTransaction).length > 0) {
                    transactions.push(currentTransaction as RecurringTransaction);
                }
                currentTransaction = {};
            } else if (line.startsWith('- ')) {
                const [key, value] = line.slice(2).split(': ').map(s => s.trim());
                switch (key) {
                    case 'Amount':
                        currentTransaction.amount = parseFloat(value);
                        break;
                    case 'Type':
                        currentTransaction.type = value as 'income' | 'expense';
                        break;
                    case 'Category':
                        currentTransaction.category = value;
                        break;
                    case 'Account':
                        currentTransaction.account = value;
                        break;
                    case 'Description':
                        currentTransaction.description = value;
                        break;
                    case 'Frequency':
                        currentTransaction.frequency = value as 'monthly' | 'yearly';
                        break;
                    case 'Start Date':
                        currentTransaction.startDate = new Date(value);
                        break;
                    case 'End Date':
                        currentTransaction.endDate = value ? new Date(value) : undefined;
                        break;
                    case 'Currency':
                        currentTransaction.currency = value;
                        break;
                    case 'ID':
                        currentTransaction.id = value;
                        break;
                }
            }
        }

        if (Object.keys(currentTransaction).length > 0) {
            transactions.push(currentTransaction as RecurringTransaction);
        }

        return transactions;
    }

    private formatRecurringTransaction(transaction: RecurringTransaction): string {
        return `## Recurring Transaction ${transaction.id}

- Amount: ${transaction.amount}
- Type: ${transaction.type}
- Category: ${transaction.category}
- Account: ${transaction.account}
- Description: ${transaction.description}
- Frequency: ${transaction.frequency}
- Start Date: ${format(transaction.startDate, 'yyyy-MM-dd')}
- End Date: ${transaction.endDate ? format(transaction.endDate, 'yyyy-MM-dd') : ''}
- Currency: ${transaction.currency}
- ID: ${transaction.id}

`;
    }

    private async addRecurringTransactionToContent(transaction: RecurringTransaction) {
        const year = getYear(transaction.startDate);
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const newContent = content + this.formatRecurringTransaction(transaction);
        await this.app.vault.modify(file, newContent);
    }

    private async updateRecurringTransactionInContent(transaction: RecurringTransaction) {
        const year = getYear(transaction.startDate);
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const transactionIndex = lines.findIndex(line => 
            line.startsWith('## Recurring Transaction ') && line.includes(transaction.id)
        );

        if (transactionIndex !== -1) {
            const nextTransactionIndex = lines.findIndex((line, index) => 
                index > transactionIndex && line.startsWith('## Recurring Transaction ')
            );
            const endIndex = nextTransactionIndex === -1 ? lines.length : nextTransactionIndex;
            const newContent = [
                ...lines.slice(0, transactionIndex),
                this.formatRecurringTransaction(transaction),
                ...lines.slice(endIndex)
            ].join('\n');
            await this.app.vault.modify(file, newContent);
        }
    }

    private async deleteRecurringTransactionFromContent(id: string, startDate: Date) {
        const year = getYear(startDate);
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const transactionIndex = lines.findIndex(line => 
            line.startsWith('## Recurring Transaction ') && line.includes(id)
        );

        if (transactionIndex !== -1) {
            const nextTransactionIndex = lines.findIndex((line, index) => 
                index > transactionIndex && line.startsWith('## Recurring Transaction ')
            );
            const endIndex = nextTransactionIndex === -1 ? lines.length : nextTransactionIndex;
            const newContent = [
                ...lines.slice(0, transactionIndex),
                ...lines.slice(endIndex)
            ].join('\n');
            await this.app.vault.modify(file, newContent);
        }
    }

    async addRecurringTransaction(transaction: Omit<RecurringTransaction, 'id'>): Promise<RecurringTransaction> {
        const newTransaction: RecurringTransaction = {
            ...transaction,
            id: crypto.randomUUID()
        };
        this.recurringTransactions.push(newTransaction);
        await this.addRecurringTransactionToContent(newTransaction);
        this.eventBus.emit(EVENT_TYPES.RECURRING_TRANSACTION_CHANGED);
        return newTransaction;
    }

    async updateRecurringTransaction(transaction: RecurringTransaction): Promise<RecurringTransaction> {
        const index = this.recurringTransactions.findIndex(t => t.id === transaction.id);
        if (index === -1) {
            throw new Error('Recurring transaction not found');
        }
        this.recurringTransactions[index] = transaction;
        await this.updateRecurringTransactionInContent(transaction);
        this.eventBus.emit(EVENT_TYPES.RECURRING_TRANSACTION_CHANGED);
        return transaction;
    }

    async deleteRecurringTransaction(id: string): Promise<void> {
        const index = this.recurringTransactions.findIndex(t => t.id === id);
        if (index === -1) {
            throw new Error('Recurring transaction not found');
        }
        const transaction = this.recurringTransactions[index];
        this.recurringTransactions.splice(index, 1);
        await this.deleteRecurringTransactionFromContent(id, transaction.startDate);
        this.eventBus.emit(EVENT_TYPES.RECURRING_TRANSACTION_CHANGED);
    }

    async getRecurringTransactions(query?: RecurringTransactionQuery): Promise<RecurringTransaction[]> {
        const year = query?.year || new Date().getFullYear();
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const recurringTransactions: RecurringTransaction[] = [];
        
        // 解析文件内容
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('- ')) {
                const transaction = this.parseRecurringTransactionLine(line);
                if (transaction) {
                    recurringTransactions.push(transaction);
                }
            }
        }
        
        return recurringTransactions;
    }

    async loadRecurringTransactionsByYear(year: number): Promise<void> {
        try {
            const file = await this.getOrCreateFinanceFile(year);
            const content = await this.app.vault.read(file);
            this.recurringTransactions = this.parseRecurringTransactionsFromContent(content);
        } catch (error) {
            console.error(`Failed to load recurring transactions for year ${year}:`, error);
            this.recurringTransactions = [];
        }
    }

    private parseRecurringTransactionLine(line: string): RecurringTransaction | null {
        try {
            const match = line.match(/^- (.*?) - (.*?) - (.*?) - (.*?) - (.*?) - (.*?) - (.*?) - (.*?)$/);
            if (match) {
                const [_, amount, type, category, account, frequency, startDate, endDate, description] = match;
                return {
                    id: crypto.randomUUID(),
                    amount: parseFloat(amount),
                    type: type.trim() as 'income' | 'expense',
                    category: category.trim(),
                    account: account.trim(),
                    frequency: frequency.trim() as 'daily' | 'weekly' | 'monthly' | 'yearly',
                    startDate: new Date(startDate.trim()),
                    endDate: endDate.trim() ? new Date(endDate.trim()) : undefined,
                    description: description.trim() || undefined,
                    currency: 'CNY'
                };
            }
        } catch (error) {
            console.error('Failed to parse recurring transaction line:', error);
        }
        return null;
    }
} 