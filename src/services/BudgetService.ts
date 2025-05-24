import { App, TFile } from 'obsidian';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import { FinanceSettings } from '../settings';
import { Budget } from '../types/Budget';

interface BudgetStatus {
    budget: Budget;
    spent: number;
    remaining: number;
    percentage: number;
}

interface BudgetQuery {
    year?: number;
}

export class BudgetService {
    private app: App;
    private settings: FinanceSettings;
    private budgets: Budget[] = [];
    private initialized: boolean = false;

    constructor(app: App, settings: FinanceSettings) {
        this.app = app;
        this.settings = settings;
    }

    async initialize(): Promise<void> {
        try {
            const { vault } = this.app;
            const currentYear = new Date().getFullYear();
            const yearPath = `${this.settings.financeFilePath}/${currentYear}`;

            // 确保年份目录存在
            try {
                await vault.createFolder(yearPath);
            } catch (error) {
                // 目录可能已存在，忽略错误
            }

            // 确保文件存在
            const filePath = `${yearPath}/budgets.finance.md`;
            const file = vault.getAbstractFileByPath(filePath);
            if (!file) {
                await vault.create(filePath, this.getInitialContent(currentYear));
            }

            // 加载预算数据
            if (!this.initialized) {
                await this.loadBudgets();
                this.initialized = true;
            }
        } catch (error) {
            console.error('Failed to initialize budgets:', error);
        }
    }

    private async loadBudgets() {
        try {
            const currentYear = new Date().getFullYear();
            const file = await this.getOrCreateFinanceFile(currentYear);
            const content = await this.app.vault.read(file);
            this.budgets = this.parseBudgetsFromContent(content);
        } catch (error) {
            console.error('Failed to load budgets:', error);
            this.budgets = [];
        }
    }

    private async getOrCreateFinanceFile(year: number): Promise<TFile> {
        const { vault } = this.app;
        const yearPath = `${this.settings.financeFilePath}/${year}`;
        const filePath = `${yearPath}/budgets.finance.md`;

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
        return `# ${year} Budgets\n\n`;
    }

    private parseBudgetsFromContent(content: string): Budget[] {
        const budgets: Budget[] = [];
        const lines = content.split('\n');
        let currentBudget: Partial<Budget> = {};

        for (const line of lines) {
            if (line.startsWith('## ')) {
                if (Object.keys(currentBudget).length > 0) {
                    budgets.push(currentBudget as Budget);
                }
                currentBudget = {};
            } else if (line.startsWith('- ')) {
                const [key, value] = line.slice(2).split(': ').map(s => s.trim());
                switch (key) {
                    case 'Amount':
                        currentBudget.amount = parseFloat(value);
                        break;
                    case 'Category':
                        currentBudget.category = value;
                        break;
                    case 'Period':
                        currentBudget.period = value as 'monthly' | 'yearly';
                        break;
                    case 'Description':
                        currentBudget.description = value;
                        break;
                    case 'Currency':
                        currentBudget.currency = value;
                        break;
                    case 'ID':
                        currentBudget.id = value;
                        break;
                }
            }
        }

        if (Object.keys(currentBudget).length > 0) {
            budgets.push(currentBudget as Budget);
        }

        return budgets;
    }

    private formatBudget(budget: Budget): string {
        return `## Budget ${budget.id}

- Amount: ${budget.amount}
- Category: ${budget.category}
- Period: ${budget.period}
- Description: ${budget.description || ''}
- Currency: ${budget.currency}
- ID: ${budget.id}

`;
    }

    private async addBudgetToContent(budget: Budget) {
        const currentYear = new Date().getFullYear();
        const file = await this.getOrCreateFinanceFile(currentYear);
        const content = await this.app.vault.read(file);
        const newContent = content + this.formatBudget(budget);
        await this.app.vault.modify(file, newContent);
    }

    private async updateBudgetInContent(budget: Budget) {
        const currentYear = new Date().getFullYear();
        const file = await this.getOrCreateFinanceFile(currentYear);
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const budgetIndex = lines.findIndex(line => 
            line.startsWith('## Budget ') && line.includes(budget.id)
        );

        if (budgetIndex !== -1) {
            const nextBudgetIndex = lines.findIndex((line, index) => 
                index > budgetIndex && line.startsWith('## Budget ')
            );
            const endIndex = nextBudgetIndex === -1 ? lines.length : nextBudgetIndex;
            const newContent = [
                ...lines.slice(0, budgetIndex),
                this.formatBudget(budget),
                ...lines.slice(endIndex)
            ].join('\n');
            await this.app.vault.modify(file, newContent);
        }
    }

    private async deleteBudgetFromContent(id: string) {
        const currentYear = new Date().getFullYear();
        const file = await this.getOrCreateFinanceFile(currentYear);
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const budgetIndex = lines.findIndex(line => 
            line.startsWith('## Budget ') && line.includes(id)
        );

        if (budgetIndex !== -1) {
            const nextBudgetIndex = lines.findIndex((line, index) => 
                index > budgetIndex && line.startsWith('## Budget ')
            );
            const endIndex = nextBudgetIndex === -1 ? lines.length : nextBudgetIndex;
            const newContent = [
                ...lines.slice(0, budgetIndex),
                ...lines.slice(endIndex)
            ].join('\n');
            await this.app.vault.modify(file, newContent);
        }
    }

    async addBudget(budget: Omit<Budget, 'id'>): Promise<Budget> {
        const newBudget: Budget = {
            ...budget,
            id: crypto.randomUUID()
        };
        this.budgets.push(newBudget);
        await this.addBudgetToContent(newBudget);
        return newBudget;
    }

    async updateBudget(budget: Budget): Promise<Budget> {
        const index = this.budgets.findIndex(b => b.id === budget.id);
        if (index === -1) {
            throw new Error('Budget not found');
        }
        this.budgets[index] = budget;
        await this.updateBudgetInContent(budget);
        return budget;
    }

    async deleteBudget(id: string): Promise<void> {
        const index = this.budgets.findIndex(b => b.id === id);
        if (index === -1) {
            throw new Error('Budget not found');
        }
        this.budgets.splice(index, 1);
        await this.deleteBudgetFromContent(id);
    }

    async getBudgets(query?: BudgetQuery): Promise<Budget[]> {
        if (!this.initialized) {
            await this.initialize();
        }
        const year = query?.year || new Date().getFullYear();
        const file = await this.getOrCreateFinanceFile(year);
        const content = await this.app.vault.read(file);
        const budgets: Budget[] = [];
        
        // 解析文件内容
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('- ')) {
                const budget = this.parseBudgetLine(line);
                if (budget) {
                    budgets.push(budget);
                }
            }
        }
        
        return budgets;
    }

    async loadBudgetsByYear(year: number): Promise<void> {
        try {
            const file = await this.getOrCreateFinanceFile(year);
            const content = await this.app.vault.read(file);
            this.budgets = this.parseBudgetsFromContent(content);
        } catch (error) {
            console.error(`Failed to load budgets for year ${year}:`, error);
            this.budgets = [];
        }
    }

    async getBudgetStatus(id: string): Promise<BudgetStatus | null> {
        const budget = this.budgets.find(b => b.id === id);
        if (!budget) return null;

        const spent = await this.calculateSpent(budget.category);
        return {
            budget,
            spent,
            remaining: budget.amount - spent,
            percentage: (spent / budget.amount) * 100
        };
    }

    private async calculateSpent(category: string): Promise<number> {
        // 这里需要调用 TransactionService 来获取支出总额
        // 暂时返回 0
        return 0;
    }

    private parseBudgetLine(line: string): Budget | null {
        try {
            const match = line.match(/^- (.*?) - (.*?) - (.*?) - (.*?) - (.*?)$/);
            if (match) {
                const [_, amount, category, period, currency, description] = match;
                return {
                    id: crypto.randomUUID(),
                    amount: parseFloat(amount),
                    category: category.trim(),
                    period: period.trim() as 'monthly' | 'yearly',
                    currency: currency.trim(),
                    description: description.trim() || undefined
                };
            }
        } catch (error) {
            console.error('Failed to parse budget line:', error);
        }
        return null;
    }
} 