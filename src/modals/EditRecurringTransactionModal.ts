import { App, Modal, Notice } from 'obsidian';
import { RecurringTransactionService } from '../services/RecurringTransactionService';
import { TransactionService } from '../services/TransactionService';
import { RecurringTransaction } from '../types/RecurringTransaction';

export class EditRecurringTransactionModal extends Modal {
    private recurringTransactionService: RecurringTransactionService;
    private transactionService: TransactionService;
    private recurringTransaction: RecurringTransaction;
    private amountInput: HTMLInputElement;
    private typeSelect: HTMLSelectElement;
    private categorySelect: HTMLSelectElement;
    private accountSelect: HTMLSelectElement;
    private descriptionInput: HTMLInputElement;
    private frequencySelect: HTMLSelectElement;
    private startDateInput: HTMLInputElement;
    private endDateInput: HTMLInputElement;
    private currencyInput: HTMLInputElement;

    constructor(app: App, recurringTransactionService: RecurringTransactionService, transactionService: TransactionService, recurringTransaction: RecurringTransaction) {
        super(app);
        this.recurringTransactionService = recurringTransactionService;
        this.transactionService = transactionService;
        this.recurringTransaction = recurringTransaction;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', {text: 'Edit Recurring Transaction'});

        // 创建表单
        const form = contentEl.createEl('form');
        form.addClass('finance-form');

        // 金额
        const amountGroup = form.createEl('div', {cls: 'form-group'});
        amountGroup.createEl('label', {text: 'Amount'});
        this.amountInput = amountGroup.createEl('input', {
            attr: {
                type: 'number',
                step: '0.01',
                required: 'true'
            },
            value: this.recurringTransaction.amount.toString()
        });

        // 类型
        const typeGroup = form.createEl('div', {cls: 'form-group'});
        typeGroup.createEl('label', {text: 'Type'});
        this.typeSelect = typeGroup.createEl('select');
        this.typeSelect.createEl('option', {text: 'Income', value: 'income'});
        this.typeSelect.createEl('option', {text: 'Expense', value: 'expense'});
        this.typeSelect.value = this.recurringTransaction.type;

        // 分类
        const categoryGroup = form.createEl('div', {cls: 'form-group'});
        categoryGroup.createEl('label', {text: 'Category'});
        this.categorySelect = categoryGroup.createEl('select');
        const categories = this.transactionService.getCategories();
        categories.forEach(category => {
            this.categorySelect.createEl('option', {text: category, value: category});
        });
        this.categorySelect.value = this.recurringTransaction.category;

        // 账户
        const accountGroup = form.createEl('div', {cls: 'form-group'});
        accountGroup.createEl('label', {text: 'Account'});
        this.accountSelect = accountGroup.createEl('select');
        const accounts = this.transactionService.getAccounts();
        accounts.forEach(account => {
            this.accountSelect.createEl('option', {text: account, value: account});
        });
        this.accountSelect.value = this.recurringTransaction.account;

        // 描述
        const descriptionGroup = form.createEl('div', {cls: 'form-group'});
        descriptionGroup.createEl('label', {text: 'Description'});
        this.descriptionInput = descriptionGroup.createEl('input', {
            type: 'text',
            value: this.recurringTransaction.description
        });

        // 频率
        const frequencyGroup = form.createEl('div', {cls: 'form-group'});
        frequencyGroup.createEl('label', {text: 'Frequency'});
        this.frequencySelect = frequencyGroup.createEl('select');
        this.frequencySelect.createEl('option', {text: 'Daily', value: 'daily'});
        this.frequencySelect.createEl('option', {text: 'Weekly', value: 'weekly'});
        this.frequencySelect.createEl('option', {text: 'Monthly', value: 'monthly'});
        this.frequencySelect.createEl('option', {text: 'Yearly', value: 'yearly'});
        this.frequencySelect.value = this.recurringTransaction.frequency;

        // 开始日期
        const startDateGroup = form.createEl('div', {cls: 'form-group'});
        startDateGroup.createEl('label', {text: 'Start Date'});
        this.startDateInput = startDateGroup.createEl('input', {
            type: 'date',
            value: new Date(this.recurringTransaction.startDate).toISOString().split('T')[0]
        });

        // 结束日期
        const endDateGroup = form.createEl('div', {cls: 'form-group'});
        endDateGroup.createEl('label', {text: 'End Date (Optional)'});
        this.endDateInput = endDateGroup.createEl('input', {
            type: 'date',
            value: this.recurringTransaction.endDate ? new Date(this.recurringTransaction.endDate).toISOString().split('T')[0] : ''
        });

        // 货币
        const currencyGroup = form.createEl('div', {cls: 'form-group'});
        currencyGroup.createEl('label', {text: 'Currency'});
        this.currencyInput = currencyGroup.createEl('input', {
            type: 'text',
            value: this.recurringTransaction.currency || 'CNY'
        });

        // 提交按钮
        const buttonGroup = form.createEl('div', {cls: 'form-group'});
        const submitButton = buttonGroup.createEl('button', {
            text: 'Save Changes',
            cls: 'btn btn-primary'
        });

        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await this.recurringTransactionService.updateRecurringTransaction({
                    ...this.recurringTransaction,
                    amount: parseFloat(this.amountInput.value),
                    type: this.typeSelect.value as 'income' | 'expense',
                    category: this.categorySelect.value,
                    account: this.accountSelect.value,
                    description: this.descriptionInput.value,
                    frequency: this.frequencySelect.value as 'daily' | 'weekly' | 'monthly' | 'yearly',
                    startDate: new Date(this.startDateInput.value),
                    endDate: this.endDateInput.value ? new Date(this.endDateInput.value) : undefined,
                    currency: this.currencyInput.value
                });
                new Notice('Recurring transaction updated successfully');
                this.close();
            } catch (error) {
                new Notice('Failed to update recurring transaction: ' + error.message);
            }
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
} 