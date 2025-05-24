import { App, Modal, Setting } from 'obsidian';
import { TransactionService } from '../services/TransactionService';
import { Transaction } from '../types/Transaction';

export class AddTransactionModal extends Modal {
    private transactionService: TransactionService;
    private date: string = new Date().toISOString().split('T')[0];
    private amount: number = 0;
    private type: 'income' | 'expense' = 'expense';
    private category: string = '';
    private account: string = '';
    private description: string = '';
    private currency: string = 'CNY';

    constructor(app: App, transactionService: TransactionService) {
        super(app);
        this.transactionService = transactionService;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', { text: 'Add Transaction' });

        new Setting(contentEl)
            .setName('Date')
            .addText(text => text
                .setValue(this.date)
                .onChange(value => this.date = value)
                .inputEl.setAttribute('type', 'date'));

        new Setting(contentEl)
            .setName('Amount')
            .addText(text => text
                .setValue(this.amount.toString())
                .onChange(value => this.amount = parseFloat(value) || 0)
                .inputEl.setAttribute('type', 'number'));

        new Setting(contentEl)
            .setName('Type')
            .addDropdown(dropdown => dropdown
                .addOption('income', 'Income')
                .addOption('expense', 'Expense')
                .setValue(this.type)
                .onChange(value => this.type = value as 'income' | 'expense'));

        new Setting(contentEl)
            .setName('Category')
            .addText(text => text
                .setValue(this.category)
                .onChange(value => this.category = value));

        new Setting(contentEl)
            .setName('Account')
            .addText(text => text
                .setValue(this.account)
                .onChange(value => this.account = value));

        new Setting(contentEl)
            .setName('Description')
            .addTextArea(text => text
                .setValue(this.description)
                .onChange(value => this.description = value));

        new Setting(contentEl)
            .setName('Currency')
            .addText(text => text
                .setValue(this.currency)
                .onChange(value => this.currency = value));

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText('Add')
                .onClick(async () => {
                    try {
                        const transaction: Omit<Transaction, 'id'> = {
                            date: new Date(this.date),
                            amount: this.amount,
                            type: this.type,
                            category: this.category,
                            account: this.account,
                            description: this.description,
                            currency: this.currency
                        };
                        await this.transactionService.addTransaction(transaction);
                        this.close();
                    } catch (error) {
                        console.error('Failed to add transaction:', error);
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 