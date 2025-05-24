import { App, Modal, Setting } from 'obsidian';
import { RecurringTransactionService } from '../services/RecurringTransactionService';
import { RecurringTransaction } from '../types/RecurringTransaction';

export class AddRecurringTransactionModal extends Modal {
    private recurringTransactionService: RecurringTransactionService;
    private amount: number = 0;
    private type: 'income' | 'expense' = 'expense';
    private category: string = '';
    private account: string = '';
    private description: string = '';
    private frequency: 'monthly' | 'yearly' = 'monthly';
    private startDate: string = new Date().toISOString().split('T')[0];
    private endDate: string = '';
    private currency: string = 'CNY';

    constructor(app: App, recurringTransactionService: RecurringTransactionService) {
        super(app);
        this.recurringTransactionService = recurringTransactionService;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', { text: 'Add Recurring Transaction' });

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
            .setName('Frequency')
            .addDropdown(dropdown => dropdown
                .addOption('monthly', 'Monthly')
                .addOption('yearly', 'Yearly')
                .setValue(this.frequency)
                .onChange(value => this.frequency = value as 'monthly' | 'yearly'));

        new Setting(contentEl)
            .setName('Start Date')
            .addText(text => text
                .setValue(this.startDate)
                .onChange(value => this.startDate = value)
                .inputEl.setAttribute('type', 'date'));

        new Setting(contentEl)
            .setName('End Date')
            .addText(text => text
                .setValue(this.endDate)
                .onChange(value => this.endDate = value)
                .inputEl.setAttribute('type', 'date'));

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
                        const recurringTransaction: Omit<RecurringTransaction, 'id'> = {
                            amount: this.amount,
                            type: this.type,
                            category: this.category,
                            account: this.account,
                            description: this.description,
                            frequency: this.frequency,
                            startDate: new Date(this.startDate),
                            endDate: this.endDate ? new Date(this.endDate) : undefined,
                            currency: this.currency
                        };
                        await this.recurringTransactionService.addRecurringTransaction(recurringTransaction);
                        this.close();
                    } catch (error) {
                        console.error('Failed to add recurring transaction:', error);
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 