import { App, Modal, Notice } from 'obsidian';
import { TransactionService } from '../services/TransactionService';
import { Transaction } from '../types/Transaction';

export class EditTransactionModal extends Modal {
    private transactionService: TransactionService;
    private transaction: Transaction;
    private amountInput: HTMLInputElement;
    private typeSelect: HTMLSelectElement;
    private categoryInput: HTMLInputElement;
    private accountInput: HTMLInputElement;
    private descriptionInput: HTMLInputElement;
    private dateInput: HTMLInputElement;

    constructor(app: App, transactionService: TransactionService, transaction: Transaction) {
        super(app);
        this.transactionService = transactionService;
        this.transaction = transaction;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', {text: 'Edit Transaction'});

        // 创建表单
        const form = contentEl.createEl('form');
        form.addClass('finance-form');

        // 日期
        const dateGroup = form.createEl('div', {cls: 'form-group'});
        dateGroup.createEl('label', {text: 'Date'});
        this.dateInput = dateGroup.createEl('input', {
            type: 'date',
            value: new Date(this.transaction.date).toISOString().split('T')[0]
        });

        // 金额
        const amountGroup = form.createEl('div', {cls: 'form-group'});
        amountGroup.createEl('label', {text: 'Amount'});
        this.amountInput = amountGroup.createEl('input', {
            attr: {
                type: 'number',
                step: '0.01',
                required: 'true'
            },
            value: this.transaction.amount.toString()
        });

        // 类型
        const typeGroup = form.createEl('div', {cls: 'form-group'});
        typeGroup.createEl('label', {text: 'Type'});
        this.typeSelect = typeGroup.createEl('select');
        this.typeSelect.createEl('option', {text: 'Income', value: 'income'});
        this.typeSelect.createEl('option', {text: 'Expense', value: 'expense'});
        this.typeSelect.value = this.transaction.type;

        // 分类
        const categoryGroup = form.createEl('div', {cls: 'form-group'});
        categoryGroup.createEl('label', {text: 'Category'});
        this.categoryInput = categoryGroup.createEl('input', {
            attr: {
                type: 'text',
                required: 'true'
            },
            value: this.transaction.category
        });

        // 账户
        const accountGroup = form.createEl('div', {cls: 'form-group'});
        accountGroup.createEl('label', {text: 'Account'});
        this.accountInput = accountGroup.createEl('input', {
            attr: {
                type: 'text',
                required: 'true'
            },
            value: this.transaction.account
        });

        // 描述
        const descriptionGroup = form.createEl('div', {cls: 'form-group'});
        descriptionGroup.createEl('label', {text: 'Description'});
        this.descriptionInput = descriptionGroup.createEl('input', {
            type: 'text',
            value: this.transaction.description
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
                await this.transactionService.updateTransaction({
                    ...this.transaction,
                    date: new Date(this.dateInput.value),
                    amount: parseFloat(this.amountInput.value),
                    type: this.typeSelect.value as 'income' | 'expense',
                    category: this.categoryInput.value,
                    account: this.accountInput.value,
                    description: this.descriptionInput.value
                });
                new Notice('Transaction updated successfully');
                this.close();
            } catch (error) {
                new Notice('Failed to update transaction: ' + error.message);
            }
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
} 