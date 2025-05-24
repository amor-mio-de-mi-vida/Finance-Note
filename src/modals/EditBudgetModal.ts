import { App, Modal, Setting, Notice } from 'obsidian';
import { BudgetService } from '../services/BudgetService';
import { TransactionService } from '../services/TransactionService';
import { Budget } from '../types/Budget';

export class EditBudgetModal extends Modal {
    private budgetService: BudgetService;
    private transactionService: TransactionService;
    private budget: Budget;
    private amount: number;
    private category: string;
    private period: 'monthly' | 'yearly';
    private description: string;
    private currency: string;

    constructor(app: App, budgetService: BudgetService, transactionService: TransactionService, budget: Budget) {
        super(app);
        this.budgetService = budgetService;
        this.transactionService = transactionService;
        this.budget = budget;
        this.amount = budget.amount;
        this.category = budget.category;
        this.period = budget.period;
        this.description = budget.description || '';
        this.currency = budget.currency;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', { text: 'Edit Budget' });

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

        // 周期
        new Setting(contentEl)
            .setName('Period')
            .addDropdown(dropdown => dropdown
                .addOption('monthly', 'Monthly')
                .addOption('yearly', 'Yearly')
                .setValue(this.period)
                .onChange(value => this.period = value as 'monthly' | 'yearly'));

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
                    if (!this.amount || !this.category || !this.currency) {
                        new Notice('Please fill in all required fields');
                        return;
                    }
                    try {
                        const updatedBudget: Budget = {
                            ...this.budget,
                            amount: this.amount,
                            category: this.category,
                            period: this.period,
                            description: this.description || undefined,
                            currency: this.currency
                        };
                        await this.budgetService.updateBudget(updatedBudget);
                        new Notice('Budget updated successfully');
                        this.close();
                    } catch (error) {
                        new Notice('Failed to update budget: ' + error.message);
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 