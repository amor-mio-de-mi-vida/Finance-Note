import { App, TFile } from 'obsidian';
import { format, parse, getYear } from 'date-fns';
import { FinanceSettings } from '../settings';
import { Transaction } from '../types/Transaction';

interface TransactionQuery {
    startDate?: Date;
    endDate?: Date;
    categories?: string[];
    accounts?: string[];
    types?: ('income' | 'expense')[];
    sort?: {
        field: keyof Transaction;
        direction: 'asc' | 'desc';
        priority: number;
    }[];
    page?: number;
    pageSize?: number;
}

export class TransactionService {
    private app: App;
    private settings: FinanceSettings;
    private transactions: Transaction[] = [];

    constructor(app: App, settings: FinanceSettings) {
        this.app = app;
        this.settings = settings;
        this.loadTransactions();
    }

    private async loadTransactions() {
        try {
            const currentYear = new Date().getFullYear();
            const file = await this.getOrCreateFinanceFile(currentYear);
            const content = await this.app.vault.read(file);
            this.transactions = this.parseTransactionsFromContent(content);
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.transactions = [];
        }
    }

    private async getOrCreateFinanceFile(year: number): Promise<TFile> {
        const { vault } = this.app;
        const yearPath = `${this.settings.financeFilePath}/${year}`;
        const filePath = `${yearPath}/transactions.finance.md`;

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
        return `# ${year} Transactions\n\n`;
    }

    private parseTransactionsFromContent(content: string): Transaction[] {
        const transactions: Transaction[] = [];
        const lines = content.split('\n');
        let currentTransaction: Partial<Transaction> = {};

        for (const line of lines) {
            if (line.startsWith('## ')) {
                if (Object.keys(currentTransaction).length > 0) {
                    transactions.push(currentTransaction as Transaction);
                }
                currentTransaction = {};
            } else if (line.startsWith('- ')) {
                const [key, value] = line.slice(2).split(': ').map(s => s.trim());
                switch (key) {
                    case 'Date':
                        currentTransaction.date = new Date(value);
                        break;
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
            transactions.push(currentTransaction as Transaction);
        }

        return transactions;
    }

    private formatTransaction(transaction: Transaction): string {
        return `## Transaction ${transaction.id}

- Date: ${format(transaction.date, 'yyyy-MM-dd')}
- Amount: ${transaction.amount}
- Type: ${transaction.type}
- Category: ${transaction.category}
- Account: ${transaction.account}
- Description: ${transaction.description}
- Currency: ${transaction.currency}
- ID: ${transaction.id}

`;
    }

    private async addTransactionToContent(transaction: Transaction) {
        const year = getYear(transaction.date);
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const newContent = content + this.formatTransaction(transaction);
        await this.app.vault.modify(file, newContent);
    }

    private async updateTransactionInContent(transaction: Transaction) {
        const year = getYear(transaction.date);
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const transactionIndex = lines.findIndex(line => 
            line.startsWith('## Transaction ') && line.includes(transaction.id)
        );

        if (transactionIndex !== -1) {
            const nextTransactionIndex = lines.findIndex((line, index) => 
                index > transactionIndex && line.startsWith('## Transaction ')
            );
            const endIndex = nextTransactionIndex === -1 ? lines.length : nextTransactionIndex;
            const newContent = [
                ...lines.slice(0, transactionIndex),
                this.formatTransaction(transaction),
                ...lines.slice(endIndex)
            ].join('\n');
            await this.app.vault.modify(file, newContent);
        }
    }

    private async deleteTransactionFromContent(id: string, date: Date) {
        const year = getYear(date);
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const transactionIndex = lines.findIndex(line => 
            line.startsWith('## Transaction ') && line.includes(id)
        );

        if (transactionIndex !== -1) {
            const nextTransactionIndex = lines.findIndex((line, index) => 
                index > transactionIndex && line.startsWith('## Transaction ')
            );
            const endIndex = nextTransactionIndex === -1 ? lines.length : nextTransactionIndex;
            const newContent = [
                ...lines.slice(0, transactionIndex),
                ...lines.slice(endIndex)
            ].join('\n');
            await this.app.vault.modify(file, newContent);
        }
    }

    async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
        const newTransaction: Transaction = {
            ...transaction,
            id: crypto.randomUUID()
        };
        this.transactions.push(newTransaction);
        await this.addTransactionToContent(newTransaction);
        return newTransaction;
    }

    async updateTransaction(transaction: Transaction): Promise<Transaction> {
        const index = this.transactions.findIndex(t => t.id === transaction.id);
        if (index === -1) {
            throw new Error('Transaction not found');
        }
        this.transactions[index] = transaction;
        await this.updateTransactionInContent(transaction);
        return transaction;
    }

    async deleteTransaction(id: string): Promise<void> {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index === -1) {
            throw new Error('Transaction not found');
        }
        const transaction = this.transactions[index];
        this.transactions.splice(index, 1);
        await this.deleteTransactionFromContent(id, transaction.date);
    }

    async getTransactions(query?: TransactionQuery): Promise<Transaction[]> {
        let filtered = [...this.transactions];

        if (query) {
            // 应用过滤条件
            if (query.startDate) {
                filtered = filtered.filter(t => new Date(t.date) >= query.startDate!);
            }
            if (query.endDate) {
                filtered = filtered.filter(t => new Date(t.date) <= query.endDate!);
            }
            if (query.categories) {
                filtered = filtered.filter(t => query.categories!.includes(t.category));
            }
            if (query.accounts) {
                filtered = filtered.filter(t => query.accounts!.includes(t.account));
            }
            if (query.types) {
                filtered = filtered.filter(t => query.types!.includes(t.type));
            }

            // 应用排序
            if (query.sort) {
                filtered.sort((a, b) => {
                    for (const sort of query.sort!) {
                        const aValue = String(a[sort.field] ?? '');
                        const bValue = String(b[sort.field] ?? '');
                        if (aValue !== bValue) {
                            return sort.direction === 'asc' ? 
                                aValue > bValue ? 1 : -1 :
                                aValue < bValue ? 1 : -1;
                        }
                    }
                    return 0;
                });
            }

            // 应用分页
            if (query.page && query.pageSize) {
                const start = (query.page - 1) * query.pageSize;
                const end = start + query.pageSize;
                filtered = filtered.slice(start, end);
            }
        }

        return filtered;
    }

    async loadTransactionsByYear(year: number): Promise<void> {
        try {
            const file = await this.getOrCreateFinanceFile(year);
            const content = await this.app.vault.read(file);
            this.transactions = this.parseTransactionsFromContent(content);
        } catch (error) {
            console.error(`Failed to load transactions for year ${year}:`, error);
            this.transactions = [];
        }
    }
} 