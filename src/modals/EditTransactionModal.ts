import { App, Modal, Setting, Notice } from 'obsidian';
import { TransactionService } from '../services/TransactionService';
import { Transaction } from '../types/Transaction';

export class EditTransactionModal extends Modal {
    private transactionService: TransactionService;
    private transaction: Transaction;
    private date: string;
    private amount: number;
    private type: 'income' | 'expense';
    private category: string;
    private account: string;
    private description: string;
    private currency: string;

    constructor(app: App, transactionService: TransactionService, transaction: Transaction) {
        super(app);
        this.transactionService = transactionService;
        this.transaction = transaction;
        this.date = new Date(transaction.date).toISOString().split('T')[0];
        this.amount = transaction.amount;
        this.type = transaction.type;
        this.category = transaction.category;
        this.account = transaction.account;
        this.description = transaction.description || '';
        this.currency = transaction.currency;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', { text: 'Edit Transaction' });

        // 日期
        new Setting(contentEl)
            .setName('Date')
            .addText(text => {
                text.setValue(this.date)
                    .onChange(value => this.date = value);
                text.inputEl.setAttribute('type', 'date');
            });

        // 金额
        new Setting(contentEl)
            .setName('Amount')
            .addText(text => {
                text.setValue(this.amount.toString())
                    .onChange(value => this.amount = parseFloat(value) || 0);
                text.inputEl.setAttribute('type', 'number');
                text.inputEl.setAttribute('step', '0.01');
                text.inputEl.setAttribute('required', 'true');
            });

        // 类型
        new Setting(contentEl)
            .setName('Type')
            .addDropdown(dropdown => dropdown
                .addOption('income', 'Income')
                .addOption('expense', 'Expense')
                .setValue(this.type)
                .onChange(value => this.type = value as 'income' | 'expense'));

        // 分类
        new Setting(contentEl)
            .setName('Category')
            .addDropdown(dropdown => {
                const categories = this.transactionService.getCategories();
                categories.forEach(category => {
                    dropdown.addOption(category, category);
                });
                dropdown.setValue(this.category);
                dropdown.onChange(value => this.category = value);
            });

        // 账户
        new Setting(contentEl)
            .setName('Account')
            .addDropdown(dropdown => {
                const accounts = this.transactionService.getAccounts();
                accounts.forEach(account => {
                    dropdown.addOption(account, account);
                });
                dropdown.setValue(this.account);
                dropdown.onChange(value => this.account = value);
            });

        // 描述
        new Setting(contentEl)
            .setName('Description')
            .addText(text => text
                .setValue(this.description)
                .onChange(value => this.description = value));

        // 货币
        new Setting(contentEl)
            .setName('Currency')
            .addDropdown(dropdown => {
                const settings = this.transactionService.getSettings();
                settings.currencies.forEach(currency => {
                    dropdown.addOption(currency, currency);
                });
                dropdown.setValue(this.currency);
                dropdown.onChange(value => this.currency = value);
            });

        // 提交按钮
        new Setting(contentEl)
            .addButton(button => button
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    if (!this.amount || !this.category || !this.account || !this.currency) {
                        new Notice('Please fill in all required fields');
                        return;
                    }
                    try {
                        const updatedTransaction: Transaction = {
                            ...this.transaction,
                            date: new Date(this.date),
                            amount: this.amount,
                            type: this.type,
                            category: this.category,
                            account: this.account,
                            description: this.description || undefined,
                            currency: this.currency
                        };
                        await this.transactionService.updateTransaction(updatedTransaction);
                        new Notice('Transaction updated successfully');
                        this.close();
                    } catch (error) {
                        new Notice('Failed to update transaction: ' + error.message);
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 