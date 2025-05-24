import { App, Modal, Notice } from 'obsidian';
import { BudgetService } from '../services/BudgetService';
import { TransactionService } from '../services/TransactionService';
import { Budget } from '../types/Budget';

export class AddBudgetModal extends Modal {
    private budgetService: BudgetService;
    private transactionService: TransactionService;
    private categorySelect: HTMLSelectElement;
    private amountInput: HTMLInputElement;
    private periodSelect: HTMLSelectElement;
    private yearInput: HTMLInputElement;
    private monthInput: HTMLInputElement;
    private quarterInput: HTMLInputElement;
    private descriptionInput: HTMLInputElement;
    private currencySelect: HTMLSelectElement;

    constructor(app: App, budgetService: BudgetService, transactionService: TransactionService) {
        super(app);
        this.budgetService = budgetService;
        this.transactionService = transactionService;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', {text: 'Add Budget'});

        // 创建表单
        const form = contentEl.createEl('form');
        form.addClass('finance-form');

        // 分类
        const categoryGroup = form.createEl('div', {cls: 'form-group'});
        categoryGroup.createEl('label', {text: 'Category'});
        this.categorySelect = categoryGroup.createEl('select');
        const categories = this.transactionService.getCategories();
        categories.forEach(category => {
            this.categorySelect.createEl('option', {text: category, value: category});
        });

        // 金额
        const amountGroup = form.createEl('div', {cls: 'form-group'});
        amountGroup.createEl('label', {text: 'Amount'});
        this.amountInput = amountGroup.createEl('input', {
            attr: {
                type: 'number',
                step: '0.01',
                required: 'true'
            }
        });

        // 周期
        const periodGroup = form.createEl('div', {cls: 'form-group'});
        periodGroup.createEl('label', {text: 'Period'});
        this.periodSelect = periodGroup.createEl('select');
        this.periodSelect.createEl('option', {text: 'Monthly', value: 'month'});
        this.periodSelect.createEl('option', {text: 'Quarterly', value: 'quarter'});
        this.periodSelect.createEl('option', {text: 'Yearly', value: 'year'});

        // 年份
        const yearGroup = form.createEl('div', {cls: 'form-group'});
        yearGroup.createEl('label', {text: 'Year'});
        this.yearInput = yearGroup.createEl('input', {
            attr: {
                type: 'number',
                required: 'true'
            },
            value: new Date().getFullYear().toString()
        });

        // 月份
        const monthGroup = form.createEl('div', {cls: 'form-group'});
        monthGroup.createEl('label', {text: 'Month'});
        this.monthInput = monthGroup.createEl('input', {
            type: 'number',
            attr: {
                min: '1',
                max: '12'
            },
            value: (new Date().getMonth() + 1).toString()
        });

        // 季度
        const quarterGroup = form.createEl('div', {cls: 'form-group'});
        quarterGroup.createEl('label', {text: 'Quarter'});
        this.quarterInput = quarterGroup.createEl('input', {
            type: 'number',
            attr: {
                min: '1',
                max: '4'
            },
            value: Math.floor(new Date().getMonth() / 3 + 1).toString()
        });

        // 描述
        const descriptionGroup = form.createEl('div', {cls: 'form-group'});
        descriptionGroup.createEl('label', {text: 'Description'});
        this.descriptionInput = descriptionGroup.createEl('input', {
            type: 'text'
        });

        // 货币
        const currencyGroup = form.createEl('div', {cls: 'form-group'});
        currencyGroup.createEl('label', {text: 'Currency'});
        this.currencySelect = currencyGroup.createEl('select');
        const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
        currencies.forEach(currency => {
            this.currencySelect.createEl('option', {text: currency, value: currency});
        });

        // 提交按钮
        const buttonGroup = form.createEl('div', {cls: 'form-group'});
        const submitButton = buttonGroup.createEl('button', {
            text: 'Add Budget',
            cls: 'btn btn-primary'
        });

        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const period = this.periodSelect.value as 'month' | 'quarter' | 'year';
                const year = parseInt(this.yearInput.value);
                const month = period === 'month' ? parseInt(this.monthInput.value) : undefined;
                const quarter = period === 'quarter' ? parseInt(this.quarterInput.value) : undefined;

                await this.budgetService.addBudget({
                    amount: parseFloat(this.amountInput.value),
                    category: this.categorySelect.value,
                    period: this.periodSelect.value === 'month' ? 'monthly' : 'yearly',
                    description: this.descriptionInput.value,
                    currency: this.currencySelect.value
                });
                new Notice('Budget added successfully');
                this.close();
            } catch (error) {
                new Notice('Failed to add budget: ' + error.message);
            }
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
} 