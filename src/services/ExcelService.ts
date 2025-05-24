import { App } from 'obsidian';
import * as XLSX from 'xlsx';
import { TransactionService } from './TransactionService';
import { BudgetService } from './BudgetService';
import { RecurringTransactionService } from './RecurringTransactionService';
import { FinanceSettings } from '../settings';
import { Transaction } from '../types/Transaction';
import { Budget } from '../types/Budget';
import { RecurringTransaction } from '../types/RecurringTransaction';

interface ExcelTemplate {
    headers: {
        date: string;
        amount: string;
        type: string;
        category: string;
        account: string;
        description: string;
        currency: string;
    };
    validations: {
        type: string[];
        currency: string[];
    };
    examples: {
        date: string;
        amount: string;
        type: string;
        category: string;
        account: string;
        description: string;
        currency: string;
    };
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class ExcelService {
    private app: App;
    private template: ExcelTemplate;
    private settings: FinanceSettings;
    private transactionService: TransactionService;
    private budgetService: BudgetService;
    private recurringTransactionService: RecurringTransactionService;

    constructor(
        app: App,
        settings: FinanceSettings,
        transactionService: TransactionService,
        budgetService: BudgetService,
        recurringTransactionService: RecurringTransactionService
    ) {
        this.app = app;
        this.settings = settings;
        this.transactionService = transactionService;
        this.budgetService = budgetService;
        this.recurringTransactionService = recurringTransactionService;

        this.template = {
            headers: {
                date: '日期',
                amount: '金额',
                type: '类型',
                category: '分类',
                account: '默认',
                description: '描述',
                currency: '货币'
            },
            validations: {
                type: ['收入', '支出'],
                currency: this.settings.currencies
            },
            examples: {
                date: '2024-03-20',
                amount: '100.00',
                type: '支出',
                category: '餐饮',
                account: '默认',
                description: '午餐',
                currency: this.settings.defaultCurrency
            }
        };
    }

    async generateTemplate(): Promise<Blob> {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
            Object.values(this.template.headers),
            Object.values(this.template.examples)
        ]);

        // 添加数据验证
        const validations = {
            type: {
                type: 'list',
                values: this.template.validations.type
            },
            currency: {
                type: 'list',
                values: this.template.validations.currency
            }
        };

        // 设置列宽
        const colWidths = [
            { wch: 12 }, // 日期
            { wch: 10 }, // 金额
            { wch: 8 },  // 类型
            { wch: 10 }, // 分类
            { wch: 12 }, // 账户
            { wch: 20 }, // 描述
            { wch: 8 }   // 货币
        ];
        worksheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, '交易记录模板');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    async validateImport(data: any[]): Promise<ValidationResult> {
        const errors: string[] = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2; // 加2是因为第一行是标题，第二行是示例

            // 验证必填字段
            for (const [key, value] of Object.entries(this.template.headers)) {
                if (!row[key]) {
                    errors.push(`第${rowNum}行: ${value}不能为空`);
                }
            }

            // 验证日期格式
            if (row.date && !this.isValidDate(row.date)) {
                errors.push(`第${rowNum}行: 日期格式不正确，应为YYYY-MM-DD`);
            }

            // 验证金额格式
            if (row.amount && isNaN(parseFloat(row.amount))) {
                errors.push(`第${rowNum}行: 金额必须是数字`);
            }

            // 验证类型
            if (row.type && !this.template.validations.type.includes(row.type)) {
                errors.push(`第${rowNum}行: 类型必须是${this.template.validations.type.join('或')}`);
            }

            // 验证货币
            if (row.currency && !this.template.validations.currency.includes(row.currency)) {
                errors.push(`第${rowNum}行: 货币必须是${this.template.validations.currency.join('或')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    async exportToExcel(type: 'transaction' | 'budget' | 'recurring'): Promise<void> {
        let data: any[] = [];
        let headers: string[] = [];

        switch (type) {
            case 'transaction':
                const transactions = await this.transactionService.getTransactions({
                    startDate: new Date(new Date().getFullYear(), 0, 1),
                    endDate: new Date(new Date().getFullYear(), 11, 31)
                });
                data = transactions.map(t => ({
                    Date: new Date(t.date).toLocaleDateString(),
                    Description: t.description,
                    Amount: t.amount,
                    Type: t.type,
                    Category: t.category,
                    Account: t.account,
                    Currency: t.currency
                }));
                headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Currency'];
                break;

            case 'budget':
                const budgets = await this.budgetService.getBudgets();
                data = budgets.map(b => ({
                    Period: b.period,
                    Category: b.category,
                    Amount: b.amount,
                    Status: b.status
                }));
                headers = ['Period', 'Category', 'Amount', 'Status'];
                break;

            case 'recurring':
                const recurring = await this.recurringTransactionService.getRecurringTransactions();
                data = recurring.map(r => ({
                    Description: r.description,
                    Amount: r.amount,
                    Frequency: r.frequency,
                    Category: r.category,
                    Account: r.account,
                    StartDate: new Date(r.startDate).toLocaleDateString(),
                    EndDate: r.endDate ? new Date(r.endDate).toLocaleDateString() : 'No end date'
                }));
                headers = ['Description', 'Amount', 'Frequency', 'Category', 'Account', 'StartDate', 'EndDate'];
                break;
        }

        // 创建 CSV 内容
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => row[header]).join(','))
        ].join('\n');

        // 创建 Blob 对象
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const link = document.createElement('a');
        link.href = url;
        link.download = `finance_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async exportToCSV(data: any[]): Promise<Blob> {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, '交易记录');
        const csvBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'string' });
        return new Blob([csvBuffer], { type: 'text/csv;charset=utf-8;' });
    }

    async importFromExcel(file: File): Promise<void> {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            return row;
        });

        // 根据文件名判断导入类型
        if (file.name.includes('transaction')) {
            for (const row of data) {
                const transaction: Omit<Transaction, 'id'> = {
                    date: new Date(row.Date),
                    amount: parseFloat(row.Amount),
                    type: row.Type.toLowerCase() as 'income' | 'expense',
                    category: row.Category,
                    account: row.Account,
                    description: row.Description,
                    currency: row.Currency
                };
                await this.transactionService.addTransaction(transaction);
            }
        } else if (file.name.includes('budget')) {
            for (const row of data) {
                const budget: Omit<Budget, 'id'> = {
                    amount: parseFloat(row['Amount']),
                    category: row['Category'],
                    period: row['Period'] as 'monthly' | 'yearly',
                    description: row['Description'],
                    currency: row['Currency'] || this.settings.defaultCurrency
                };
                await this.budgetService.addBudget(budget);
            }
        } else if (file.name.includes('recurring')) {
            for (const row of data) {
                const recurringTransaction: Omit<RecurringTransaction, 'id'> = {
                    amount: parseFloat(row.Amount),
                    type: row.Type.toLowerCase() as 'income' | 'expense',
                    category: row.Category,
                    account: row.Account,
                    description: row.Description,
                    frequency: row.Frequency.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
                    startDate: new Date(row.StartDate),
                    endDate: row.EndDate ? new Date(row.EndDate) : undefined,
                    currency: row.Currency
                };
                await this.recurringTransactionService.addRecurringTransaction(recurringTransaction);
            }
        }
    }

    private isValidDate(dateString: string): boolean {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;

        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }
} 