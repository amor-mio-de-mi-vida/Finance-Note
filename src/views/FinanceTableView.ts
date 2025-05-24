import { ItemView, WorkspaceLeaf } from 'obsidian';
import { TransactionService } from '../services/TransactionService';
import { BudgetService } from '../services/BudgetService';
import { RecurringTransactionService } from '../services/RecurringTransactionService';
import { ExcelService } from '../services/ExcelService';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { EditBudgetModal } from '../modals/EditBudgetModal';
import { EditRecurringTransactionModal } from '../modals/EditRecurringTransactionModal';
import { Transaction } from '../types/Transaction';
import { Budget } from '../types/Budget';
import { RecurringTransaction } from '../types/RecurringTransaction';
import { AddTransactionModal } from '../modals/AddTransactionModal';
import { AddBudgetModal } from '../modals/AddBudgetModal';
import { AddRecurringTransactionModal } from '../modals/AddRecurringTransactionModal';
import { EventBus, EVENT_TYPES } from '../services/EventBus';

export const FINANCE_TABLE_VIEW = 'finance-table-view';

export class FinanceTableView extends ItemView {
    static icon = 'dollar-sign';
    private transactionService: TransactionService;
    private budgetService: BudgetService;
    private recurringTransactionService: RecurringTransactionService;
    private excelService: ExcelService;
    private eventBus: EventBus;
    private currentType: 'transaction' | 'budget' | 'recurring' = 'transaction';
    private currentYear: number = new Date().getFullYear();
    private currentPage: number = 1;
    private itemsPerPage: number = 10;

    constructor(
        leaf: WorkspaceLeaf,
        transactionService: TransactionService,
        budgetService: BudgetService,
        recurringTransactionService: RecurringTransactionService,
        excelService: ExcelService
    ) {
        super(leaf);
        this.transactionService = transactionService;
        this.budgetService = budgetService;
        this.recurringTransactionService = recurringTransactionService;
        this.excelService = excelService;
        this.eventBus = EventBus.getInstance();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.eventBus.subscribe(EVENT_TYPES.TRANSACTION_CHANGED, () => {
            if (this.currentType === 'transaction') {
                this.render();
            }
        });

        this.eventBus.subscribe(EVENT_TYPES.BUDGET_CHANGED, () => {
            if (this.currentType === 'budget') {
                this.render();
            }
        });

        this.eventBus.subscribe(EVENT_TYPES.RECURRING_TRANSACTION_CHANGED, () => {
            if (this.currentType === 'recurring') {
                this.render();
            }
        });
    }

    getViewType(): string {
        return FINANCE_TABLE_VIEW;
    }

    getDisplayText(): string {
        return 'Finance Table';
    }

    async onOpen(): Promise<void> {
        this.render();
    }

    async onClose(): Promise<void> {
        // 取消订阅事件
        this.eventBus.unsubscribe(EVENT_TYPES.TRANSACTION_CHANGED, () => this.render());
        this.eventBus.unsubscribe(EVENT_TYPES.BUDGET_CHANGED, () => this.render());
        this.eventBus.unsubscribe(EVENT_TYPES.RECURRING_TRANSACTION_CHANGED, () => this.render());
    }

    private render(): void {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('finance-table-view');

        // 渲染工具栏
        this.renderToolbar(container);

        // 渲染表格
        switch (this.currentType) {
            case 'transaction':
                this.renderTransactionTable(container);
                break;
            case 'budget':
                this.renderBudgetTable(container);
                break;
            case 'recurring':
                this.renderRecurringTable(container);
                break;
        }
    }

    private renderToolbar(container: HTMLElement): void {
        const toolbar = container.createEl('div', { cls: 'finance-toolbar' });

        // 年份选择器
        const yearSelect = toolbar.createEl('select', { cls: 'finance-year-select' });
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            yearSelect.createEl('option', { text: year.toString(), value: year.toString() });
        }
        yearSelect.value = this.currentYear.toString();
        yearSelect.addEventListener('change', () => {
            this.currentYear = parseInt(yearSelect.value);
            this.currentPage = 1;
            this.render();
        });

        // 类型选择器
        const typeSelect = toolbar.createEl('select', { cls: 'finance-type-select' });
        typeSelect.createEl('option', { text: 'Transactions', value: 'transaction' });
        typeSelect.createEl('option', { text: 'Budgets', value: 'budget' });
        typeSelect.createEl('option', { text: 'Recurring', value: 'recurring' });
        typeSelect.value = this.currentType;
        typeSelect.addEventListener('change', () => {
            this.currentType = typeSelect.value as 'transaction' | 'budget' | 'recurring';
            this.currentPage = 1;
            this.render();
        });

        // 添加按钮
        const addButton = toolbar.createEl('button', {
            text: 'Add',
            cls: 'finance-add-button'
        });
        addButton.addEventListener('click', () => this.showAddModal());

        // 导入按钮
        const importButton = toolbar.createEl('button', {
            text: 'Import',
            cls: 'finance-import-button'
        });
        const fileInput = toolbar.createEl('input', {
            type: 'file',
            attr: {
                accept: '.csv'
            }
        });
        fileInput.style.display = 'none';
        importButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    await this.excelService.importFromExcel(file);
                    this.render();
                } catch (error) {
                    console.error('Failed to import file:', error);
                }
            }
        });

        // 导出按钮
        const exportButton = toolbar.createEl('button', {
            text: 'Export',
            cls: 'finance-export-button'
        });
        exportButton.addEventListener('click', () => {
            this.excelService.exportToExcel(this.currentType);
        });
    }

    private async renderTransactionTable(container: HTMLElement): Promise<void> {
        const table = container.createEl('table', { cls: 'finance-table' });
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        ['Date', 'Amount', 'Type', 'Category', 'Account', 'Description', 'Currency', 'Actions'].forEach(header => {
            headerRow.createEl('th', { text: header });
        });

        // 加载当前年份的交易
        const transactions = await this.transactionService.getTransactions({
            startDate: new Date(this.currentYear, 0, 1),
            endDate: new Date(this.currentYear, 11, 31)
        });

        // 应用分页
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageTransactions = transactions.slice(start, end);

        // 渲染表格内容
        const tbody = table.createEl('tbody');
        pageTransactions.forEach((transaction: Transaction) => {
            const row = tbody.createEl('tr');
            row.createEl('td', { text: new Date(transaction.date).toLocaleDateString() });
            row.createEl('td', { text: transaction.amount.toString() });
            row.createEl('td', { text: transaction.type });
            row.createEl('td', { text: transaction.category });
            row.createEl('td', { text: transaction.account });
            row.createEl('td', { text: transaction.description || '' });
            row.createEl('td', { text: transaction.currency });

            // 添加操作按钮
            const actionsCell = row.createEl('td');
            const editButton = actionsCell.createEl('button', { text: 'Edit', cls: 'btn btn-small' });
            const deleteButton = actionsCell.createEl('button', { text: 'Delete', cls: 'btn btn-small btn-danger' });

            editButton.addEventListener('click', () => {
                new EditTransactionModal(this.app, this.transactionService, transaction).open();
            });

            deleteButton.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this transaction?')) {
                    await this.transactionService.deleteTransaction(transaction.id);
                    this.render();
                }
            });
        });

        // 添加分页控件
        this.renderPagination(container, transactions.length);
    }

    private async renderBudgetTable(container: HTMLElement): Promise<void> {
        const table = container.createEl('table', { cls: 'finance-table' });
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        ['Amount', 'Category', 'Period', 'Description', 'Actions'].forEach(text => {
            headerRow.createEl('th', { text });
        });

        const tbody = table.createEl('tbody');
        // 获取当前年份的预算
        const budgets = await this.budgetService.getBudgets({
            year: this.currentYear
        });
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageBudgets = budgets.slice(startIndex, endIndex);

        pageBudgets.forEach(budget => {
            const row = tbody.createEl('tr');
            row.createEl('td', { text: budget.amount.toString() });
            row.createEl('td', { text: budget.category });
            row.createEl('td', { text: budget.period });
            row.createEl('td', { text: budget.description || '' });

            const actionsCell = row.createEl('td');
            const editButton = actionsCell.createEl('button', {
                text: 'Edit',
                cls: 'finance-edit-button'
            });
            editButton.addEventListener('click', () => {
                new EditBudgetModal(this.app, this.budgetService, budget).open();
            });

            const deleteButton = actionsCell.createEl('button', {
                text: 'Delete',
                cls: 'finance-delete-button'
            });
            deleteButton.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this budget?')) {
                    try {
                        await this.budgetService.deleteBudget(budget.id);
                        this.render();
                    } catch (error) {
                        console.error('Failed to delete budget:', error);
                    }
                }
            });
        });

        this.renderPagination(container, budgets.length);
    }

    private async renderRecurringTable(container: HTMLElement): Promise<void> {
        const table = container.createEl('table', { cls: 'finance-table' });
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        ['Amount', 'Type', 'Category', 'Account', 'Frequency', 'Start Date', 'End Date', 'Actions'].forEach(text => {
            headerRow.createEl('th', { text });
        });

        const tbody = table.createEl('tbody');
        // 获取当前年份的定期交易
        const recurringTransactions = await this.recurringTransactionService.getRecurringTransactions({
            year: this.currentYear
        });
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageRecurringTransactions = recurringTransactions.slice(startIndex, endIndex);

        pageRecurringTransactions.forEach(recurringTransaction => {
            const row = tbody.createEl('tr');
            row.createEl('td', { text: recurringTransaction.amount.toString() });
            row.createEl('td', { text: recurringTransaction.type });
            row.createEl('td', { text: recurringTransaction.category });
            row.createEl('td', { text: recurringTransaction.account });
            row.createEl('td', { text: recurringTransaction.frequency });
            row.createEl('td', { text: new Date(recurringTransaction.startDate).toLocaleDateString() });
            row.createEl('td', { text: recurringTransaction.endDate ? new Date(recurringTransaction.endDate).toLocaleDateString() : '' });

            const actionsCell = row.createEl('td');
            const editButton = actionsCell.createEl('button', {
                text: 'Edit',
                cls: 'finance-edit-button'
            });
            editButton.addEventListener('click', () => {
                new EditRecurringTransactionModal(this.app, this.recurringTransactionService, recurringTransaction).open();
            });

            const deleteButton = actionsCell.createEl('button', {
                text: 'Delete',
                cls: 'finance-delete-button'
            });
            deleteButton.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this recurring transaction?')) {
                    try {
                        await this.recurringTransactionService.deleteRecurringTransaction(recurringTransaction.id);
                        this.render();
                    } catch (error) {
                        console.error('Failed to delete recurring transaction:', error);
                    }
                }
            });
        });

        this.renderPagination(container, recurringTransactions.length);
    }

    private renderPagination(container: HTMLElement, totalItems: number): void {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const paginationContainer = container.createEl('div', { cls: 'finance-pagination' });

        // 上一页按钮
        const prevButton = paginationContainer.createEl('button', {
            text: 'Previous',
            cls: 'btn btn-small',
            attr: { disabled: this.currentPage === 1 ? 'true' : 'false' }
        });
        prevButton.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
            }
        });

        // 页码信息
        paginationContainer.createEl('span', {
            text: `Page ${this.currentPage} of ${totalPages}`,
            cls: 'finance-page-info'
        });

        // 下一页按钮
        const nextButton = paginationContainer.createEl('button', {
            text: 'Next',
            cls: 'btn btn-small',
            attr: { disabled: this.currentPage === totalPages ? 'true' : 'false' }
        });
        nextButton.addEventListener('click', () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.render();
            }
        });
    }

    private showAddModal(): void {
        switch (this.currentType) {
            case 'transaction':
                new AddTransactionModal(this.app, this.transactionService).open();
                break;
            case 'budget':
                new AddBudgetModal(this.app, this.budgetService).open();
                break;
            case 'recurring':
                new AddRecurringTransactionModal(this.app, this.recurringTransactionService).open();
                break;
        }
    }
} 