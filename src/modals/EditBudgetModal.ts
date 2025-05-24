import { App, Modal, Notice } from 'obsidian';
import { BudgetService } from '../services/BudgetService';
import { Budget } from '../types/Budget';

export class EditBudgetModal extends Modal {
    private budgetService: BudgetService;
    private budget: Budget;
    private amountInput: HTMLInputElement;
    private categoryInput: HTMLInputElement;
    private periodSelect: HTMLSelectElement;
    private descriptionInput: HTMLInputElement;

    constructor(app: App, budgetService: BudgetService, budget: Budget) {
        super(app);
        this.budgetService = budgetService;
        this.budget = budget;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.addClass('finance-modal');

        contentEl.createEl('h2', {text: 'Edit Budget'});

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
            value: this.budget.amount.toString()
        });

        // 分类
        const categoryGroup = form.createEl('div', {cls: 'form-group'});
        categoryGroup.createEl('label', {text: 'Category'});
        this.categoryInput = categoryGroup.createEl('input', {
            attr: {
                type: 'text',
                required: 'true'
            },
            value: this.budget.category
        });

        // 周期
        const periodGroup = form.createEl('div', {cls: 'form-group'});
        periodGroup.createEl('label', {text: 'Period'});
        this.periodSelect = periodGroup.createEl('select');
        this.periodSelect.createEl('option', {text: 'Monthly', value: 'monthly'});
        this.periodSelect.createEl('option', {text: 'Yearly', value: 'yearly'});
        this.periodSelect.value = this.budget.period;

        // 描述
        const descriptionGroup = form.createEl('div', {cls: 'form-group'});
        descriptionGroup.createEl('label', {text: 'Description'});
        this.descriptionInput = descriptionGroup.createEl('input', {
            type: 'text',
            value: this.budget.description || ''
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
                await this.budgetService.updateBudget({
                    ...this.budget,
                    amount: parseFloat(this.amountInput.value),
                    category: this.categoryInput.value,
                    period: this.periodSelect.value as 'monthly' | 'yearly',
                    description: this.descriptionInput.value || undefined
                });
                new Notice('Budget updated successfully');
                this.close();
            } catch (error) {
                new Notice('Failed to update budget: ' + error.message);
            }
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
} 