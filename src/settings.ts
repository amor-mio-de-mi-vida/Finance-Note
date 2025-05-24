import { App, PluginSettingTab, Setting } from 'obsidian';
import FinancePlugin from './main';

export interface FinanceSettings {
    defaultCurrency: string;
    currencies: string[];
    defaultAccount: string;
    defaultCategories: string[];
    financeFilePath: string;
    budgetFilePath: string;
    recurringTransactionsFilePath: string;
}

export const DEFAULT_SETTINGS: FinanceSettings = {
    defaultCurrency: 'CNY',
    currencies: ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'AUD', 'CAD'],
    defaultAccount: '现金',
    defaultCategories: ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '其他'],
    financeFilePath: 'Finance',
    budgetFilePath: 'Finance/Budgets',
    recurringTransactionsFilePath: 'Finance/RecurringTransactions'
};

export class FinanceSettingTab extends PluginSettingTab {
    plugin: FinancePlugin;

    constructor(app: App, plugin: FinancePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Finance Plugin Settings' });

        new Setting(containerEl)
            .setName('Default Currency')
            .setDesc('Set the default currency for transactions')
            .addDropdown(dropdown => {
                this.plugin.settings.currencies.forEach(currency => {
                    dropdown.addOption(currency, currency);
                });
                dropdown.setValue(this.plugin.settings.defaultCurrency)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultCurrency = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Available Currencies')
            .setDesc('Set the available currencies (comma-separated currency codes)')
            .addText(text => text
                .setPlaceholder('CNY,USD,EUR,JPY,GBP,HKD,SGD,AUD,CAD')
                .setValue(this.plugin.settings.currencies.join(','))
                .onChange(async (value) => {
                    const currencies = value.split(',').map(c => c.trim().toUpperCase());
                    this.plugin.settings.currencies = currencies;
                    if (!currencies.includes(this.plugin.settings.defaultCurrency)) {
                        this.plugin.settings.defaultCurrency = currencies[0] || 'CNY';
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default Account')
            .setDesc('Set the default account for transactions')
            .addText(text => text
                .setPlaceholder('现金')
                .setValue(this.plugin.settings.defaultAccount)
                .onChange(async (value) => {
                    this.plugin.settings.defaultAccount = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Default Categories')
            .setDesc('Set the default categories for transactions (comma-separated)')
            .addText(text => text
                .setPlaceholder('餐饮,交通,购物,娱乐,住房,医疗,教育,其他')
                .setValue(this.plugin.settings.defaultCategories.join(','))
                .onChange(async (value) => {
                    this.plugin.settings.defaultCategories = value.split(',').map(c => c.trim());
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Transactions File Path')
            .setDesc('Set the folder path where transaction files will be saved')
            .addText(text => text
                .setPlaceholder('Finance')
                .setValue(this.plugin.settings.financeFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.financeFilePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Budgets File Path')
            .setDesc('Set the folder path where budget files will be saved')
            .addText(text => text
                .setPlaceholder('Finance/Budgets')
                .setValue(this.plugin.settings.budgetFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.budgetFilePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Recurring Transactions File Path')
            .setDesc('Set the folder path where recurring transaction files will be saved')
            .addText(text => text
                .setPlaceholder('Finance/RecurringTransactions')
                .setValue(this.plugin.settings.recurringTransactionsFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.recurringTransactionsFilePath = value;
                    await this.plugin.saveSettings();
                }));
    }
} 