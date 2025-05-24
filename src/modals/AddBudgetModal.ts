import { App, Modal, Setting } from 'obsidian';
import { BudgetService } from '../services/BudgetService';
import { Budget } from '../types/Budget';

export class AddBudgetModal extends Modal {
    private budgetService: BudgetService;
    private amount: number = 0;
    private category: string = '';
    private period: 'monthly' | 'yearly' = 'monthly';
    private description: string = '';

    constructor(app: App, budgetService: BudgetService) {
        super(app);
        this.budgetService = budgetService;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', { text: 'Add Budget' });

        new Setting(contentEl)
            .setName('Amount')
            .addText(text => text
                .setValue(this.amount.toString())
                .onChange(value => this.amount = parseFloat(value) || 0)
                .inputEl.setAttribute('type', 'number'));

        new Setting(contentEl)
            .setName('Category')
            .addText(text => text
                .setValue(this.category)
                .onChange(value => this.category = value));

        new Setting(contentEl)
            .setName('Period')
            .addDropdown(dropdown => dropdown
                .addOption('monthly', 'Monthly')
                .addOption('yearly', 'Yearly')
                .setValue(this.period)
                .onChange(value => this.period = value as 'monthly' | 'yearly'));

        new Setting(contentEl)
            .setName('Description')
            .addTextArea(text => text
                .setValue(this.description)
                .onChange(value => this.description = value));

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText('Add')
                .onClick(async () => {
                    try {
                        const budget: Omit<Budget, 'id'> = {
                            amount: this.amount,
                            category: this.category,
                            period: this.period,
                            description: this.description
                        };
                        await this.budgetService.addBudget(budget);
                        this.close();
                    } catch (error) {
                        console.error('Failed to add budget:', error);
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 