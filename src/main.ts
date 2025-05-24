import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { ChartService } from './services/ChartService';
import { TransactionService } from './services/TransactionService';
import { BudgetService } from './services/BudgetService';
import { RecurringTransactionService } from './services/RecurringTransactionService';
import { ExcelService } from './services/ExcelService';
import { FinanceTableView, FINANCE_TABLE_VIEW } from './views/FinanceTableView';
import { ChartView, CHART_VIEW_TYPE } from './views/ChartView';

interface FinancePluginSettings {
	defaultCurrency: string;
	defaultAccount: string;
	defaultCategories: string[];
	financeFilePath: string;
	budgetFilePath: string;
	recurringTransactionsFilePath: string;
}

const DEFAULT_SETTINGS: FinancePluginSettings = {
	defaultCurrency: 'CNY',
	defaultAccount: '现金',
	defaultCategories: ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '其他'],
	financeFilePath: 'Finance',
	budgetFilePath: 'Finance',
	recurringTransactionsFilePath: 'Finance'
}

export default class FinancePlugin extends Plugin {
	settings: FinancePluginSettings;
	transactionService: TransactionService;
	budgetService: BudgetService;
	recurringTransactionService: RecurringTransactionService;
	chartService: ChartService;
	excelService: ExcelService;
	private chartView: ChartView;

	async onload() {
		await this.loadSettings();

		this.transactionService = new TransactionService(this.app, this.settings);
		this.budgetService = new BudgetService(this.app, this.settings);
		this.recurringTransactionService = new RecurringTransactionService(this.app, this.settings);
		this.chartService = new ChartService(this.app, this.transactionService);
		this.excelService = new ExcelService(
			this.app,
			this.settings,
			this.transactionService,
			this.budgetService,
			this.recurringTransactionService
		);

		// 注册视图
		this.registerView(
			FINANCE_TABLE_VIEW,
			(leaf: WorkspaceLeaf) => new FinanceTableView(
				leaf,
				this.transactionService,
				this.budgetService,
				this.recurringTransactionService,
				this.excelService
			)
		);

		// 注册图表视图
		this.registerView(
			CHART_VIEW_TYPE,
			(leaf) => (this.chartView = new ChartView(leaf, this.chartService))
		);

		// 添加命令
		this.addCommand({
			id: 'finance:show-finance-table',
			name: 'Show Finance Table',
			callback: () => {
				this.activateView();
			}
		});

		this.addCommand({
			id: 'finance:add-transaction',
			name: 'Add Transaction',
			callback: () => {
				new AddTransactionModal(this.app, this.transactionService).open();
			}
		});

		this.addCommand({
			id: 'finance:add-recurring-transaction',
			name: 'Add Recurring Transaction',
			callback: () => {
				new AddRecurringTransactionModal(this.app, this.recurringTransactionService).open();
			}
		});

		this.addCommand({
			id: 'finance:add-budget',
			name: 'Add Budget',
			callback: () => {
				new AddBudgetModal(this.app, this.budgetService).open();
			}
		});

		// 添加图表命令
		this.addCommand({
			id: 'show-finance-chart',
			name: 'Show Finance Chart',
			callback: () => {
				this.activateView();
			},
		});

		// 添加图表导出命令
		this.addCommand({
			id: 'export-finance-chart',
			name: 'Export Finance Chart',
			callback: async () => {
				if (this.chartView) {
					await this.chartView.exportChart('png');
				}
			},
		});

		// 添加设置标签页
		this.addSettingTab(new FinanceSettingTab(this.app, this));

		// 注册图表代码块
		this.registerMarkdownCodeBlockProcessor('finance', async (source, el, ctx) => {
			const chart = await this.chartService.generateChart(source);
			el.appendChild(chart);
		});

		// 添加侧边栏图标
		this.addRibbonIcon('dollar-sign', 'Finance', () => {
			this.activateView();
		});
	}

	async onunload() {
		// 清理资源
	}

	private async activateView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(FINANCE_TABLE_VIEW)[0];

		if (!leaf) {
			const newLeaf = workspace.getRightLeaf(false);
			if (newLeaf) {
				await newLeaf.setViewState({
					type: FINANCE_TABLE_VIEW,
					active: true,
				});
				leaf = newLeaf;
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// 添加图表渲染方法
	async renderChart(query: string) {
		if (this.chartView) {
			await this.chartView.renderChart(query);
		}
	}
}

class FinanceSettingTab extends PluginSettingTab {
	plugin: FinancePlugin;

	constructor(app: App, plugin: FinancePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Finance Plugin Settings'});

		new Setting(containerEl)
			.setName('Currency')
			.setDesc('Default currency for transactions')
			.addText(text => text
				.setPlaceholder('Enter currency code')
				.setValue(this.plugin.settings.defaultCurrency)
				.onChange(async (value) => {
					this.plugin.settings.defaultCurrency = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Account')
			.setDesc('Default account for transactions')
			.addText(text => text
				.setPlaceholder('Enter account name')
				.setValue(this.plugin.settings.defaultAccount)
				.onChange(async (value) => {
					this.plugin.settings.defaultAccount = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Categories')
			.setDesc('Default categories for transactions')
			.addText(text => text
				.setPlaceholder('Enter categories separated by commas')
				.setValue(this.plugin.settings.defaultCategories.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.defaultCategories = value.split(',').map(c => c.trim());
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Finance File Path')
			.setDesc('Default path for finance files')
			.addText(text => text
				.setPlaceholder('Enter finance file path')
				.setValue(this.plugin.settings.financeFilePath)
				.onChange(async (value) => {
					this.plugin.settings.financeFilePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Budget File Path')
			.setDesc('Default path for budget files')
			.addText(text => text
				.setPlaceholder('Enter budget file path')
				.setValue(this.plugin.settings.budgetFilePath)
				.onChange(async (value) => {
					this.plugin.settings.budgetFilePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Recurring Transactions File Path')
			.setDesc('Default path for recurring transactions files')
			.addText(text => text
				.setPlaceholder('Enter recurring transactions file path')
				.setValue(this.plugin.settings.recurringTransactionsFilePath)
				.onChange(async (value) => {
					this.plugin.settings.recurringTransactionsFilePath = value;
					await this.plugin.saveSettings();
				}));
	}
}

// 模态框类定义
class AddTransactionModal extends Modal {
	private transactionService: TransactionService;
	private amountInput: HTMLInputElement;
	private typeSelect: HTMLSelectElement;
	private categoryInput: HTMLInputElement;
	private accountInput: HTMLInputElement;
	private descriptionInput: HTMLInputElement;
	private dateInput: HTMLInputElement;
	private currencyInput: HTMLInputElement;

	constructor(app: App, transactionService: TransactionService) {
		super(app);
		this.transactionService = transactionService;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass('finance-modal');

		contentEl.createEl('h2', {text: 'Add Transaction'});

		// 创建表单
		const form = contentEl.createEl('form');
		form.addClass('finance-form');

		// 日期
		const dateGroup = form.createEl('div', {cls: 'form-group'});
		dateGroup.createEl('label', {text: 'Date'});
		this.dateInput = dateGroup.createEl('input', {
			type: 'date',
			value: new Date().toISOString().split('T')[0]
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

		// 类型
		const typeGroup = form.createEl('div', {cls: 'form-group'});
		typeGroup.createEl('label', {text: 'Type'});
		this.typeSelect = typeGroup.createEl('select');
		this.typeSelect.createEl('option', {text: 'Income', value: 'income'});
		this.typeSelect.createEl('option', {text: 'Expense', value: 'expense'});

		// 分类
		const categoryGroup = form.createEl('div', {cls: 'form-group'});
		categoryGroup.createEl('label', {text: 'Category'});
		this.categoryInput = categoryGroup.createEl('input', {
			attr: {
				type: 'text',
				required: 'true'
			}
		});

		// 账户
		const accountGroup = form.createEl('div', {cls: 'form-group'});
		accountGroup.createEl('label', {text: 'Account'});
		this.accountInput = accountGroup.createEl('input', {
			attr: {
				type: 'text',
				required: 'true'
			}
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
		this.currencyInput = currencyGroup.createEl('input', {
			type: 'text',
			value: 'CNY'
		});

		// 提交按钮
		const buttonGroup = form.createEl('div', {cls: 'form-group'});
		const submitButton = buttonGroup.createEl('button', {
			text: 'Add Transaction',
			cls: 'btn btn-primary'
		});

		submitButton.addEventListener('click', async (e) => {
			e.preventDefault();
			try {
				const transaction = {
					date: new Date(this.dateInput.value),
					amount: parseFloat(this.amountInput.value),
					type: this.typeSelect.value as 'income' | 'expense',
					category: this.categoryInput.value,
					account: this.accountInput.value,
					description: this.descriptionInput.value,
					currency: this.currencyInput.value
				};

				await this.transactionService.addTransaction(transaction);
				new Notice('Transaction added successfully');
				this.close();
			} catch (error) {
				new Notice('Failed to add transaction: ' + error.message);
			}
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class AddRecurringTransactionModal extends Modal {
	recurringTransactionService: RecurringTransactionService;
	private amountInput: HTMLInputElement;
	private typeSelect: HTMLSelectElement;
	private categoryInput: HTMLInputElement;
	private accountInput: HTMLInputElement;
	private descriptionInput: HTMLInputElement;
	private frequencySelect: HTMLSelectElement;
	private startDateInput: HTMLInputElement;
	private endDateInput: HTMLInputElement;

	constructor(app: App, recurringTransactionService: RecurringTransactionService) {
		super(app);
		this.recurringTransactionService = recurringTransactionService;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass('finance-modal');

		contentEl.createEl('h2', {text: 'Add Recurring Transaction'});

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
			}
		});

		// 类型
		const typeGroup = form.createEl('div', {cls: 'form-group'});
		typeGroup.createEl('label', {text: 'Type'});
		this.typeSelect = typeGroup.createEl('select');
		this.typeSelect.createEl('option', {text: 'Income', value: 'income'});
		this.typeSelect.createEl('option', {text: 'Expense', value: 'expense'});

		// 分类
		const categoryGroup = form.createEl('div', {cls: 'form-group'});
		categoryGroup.createEl('label', {text: 'Category'});
		this.categoryInput = categoryGroup.createEl('input', {
			attr: {
				type: 'text',
				required: 'true'
			}
		});

		// 账户
		const accountGroup = form.createEl('div', {cls: 'form-group'});
		accountGroup.createEl('label', {text: 'Account'});
		this.accountInput = accountGroup.createEl('input', {
			attr: {
				type: 'text',
				required: 'true'
			}
		});

		// 描述
		const descriptionGroup = form.createEl('div', {cls: 'form-group'});
		descriptionGroup.createEl('label', {text: 'Description'});
		this.descriptionInput = descriptionGroup.createEl('input', {
			type: 'text'
		});

		// 频率
		const frequencyGroup = form.createEl('div', {cls: 'form-group'});
		frequencyGroup.createEl('label', {text: 'Frequency'});
		this.frequencySelect = frequencyGroup.createEl('select');
		this.frequencySelect.createEl('option', {text: 'Daily', value: 'daily'});
		this.frequencySelect.createEl('option', {text: 'Weekly', value: 'weekly'});
		this.frequencySelect.createEl('option', {text: 'Monthly', value: 'monthly'});
		this.frequencySelect.createEl('option', {text: 'Yearly', value: 'yearly'});

		// 开始日期
		const startDateGroup = form.createEl('div', {cls: 'form-group'});
		startDateGroup.createEl('label', {text: 'Start Date'});
		this.startDateInput = startDateGroup.createEl('input', {
			type: 'date',
			value: new Date().toISOString().split('T')[0]
		});

		// 结束日期
		const endDateGroup = form.createEl('div', {cls: 'form-group'});
		endDateGroup.createEl('label', {text: 'End Date'});
		this.endDateInput = endDateGroup.createEl('input', {
			type: 'date'
		});

		// 提交按钮
		const buttonGroup = form.createEl('div', {cls: 'form-group'});
		const submitButton = buttonGroup.createEl('button', {
			text: 'Add Recurring Transaction',
			cls: 'btn btn-primary'
		});

		submitButton.addEventListener('click', async (e) => {
			e.preventDefault();
			try {
				await this.recurringTransactionService.addRecurringTransaction({
					amount: parseFloat(this.amountInput.value),
					type: this.typeSelect.value as 'income' | 'expense',
					category: this.categoryInput.value,
					account: this.accountInput.value,
					description: this.descriptionInput.value,
					frequency: this.frequencySelect.value as 'daily' | 'weekly' | 'monthly' | 'yearly',
					startDate: new Date(this.startDateInput.value),
					endDate: this.endDateInput.value ? new Date(this.endDateInput.value) : undefined,
					currency: 'CNY'
				});
				new Notice('Recurring transaction added successfully');
				this.close();
			} catch (error) {
				new Notice('Failed to add recurring transaction: ' + error.message);
			}
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class AddBudgetModal extends Modal {
	budgetService: BudgetService;
	private categoryInput: HTMLInputElement;
	private amountInput: HTMLInputElement;
	private periodSelect: HTMLSelectElement;
	private yearInput: HTMLInputElement;
	private monthInput: HTMLInputElement;
	private quarterInput: HTMLInputElement;
	private descriptionInput: HTMLInputElement;

	constructor(app: App, budgetService: BudgetService) {
		super(app);
		this.budgetService = budgetService;
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
		this.categoryInput = categoryGroup.createEl('input', {
			attr: {
				type: 'text',
				required: 'true'
			}
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
			}
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
					category: this.categoryInput.value,
					period: this.periodSelect.value === 'month' ? 'monthly' : 'yearly',
					description: this.descriptionInput.value
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