import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { ChartService } from './services/ChartService';
import { TransactionService } from './services/TransactionService';
import { BudgetService } from './services/BudgetService';
import { RecurringTransactionService } from './services/RecurringTransactionService';
import { ExcelService } from './services/ExcelService';
import { FinanceTableView, FINANCE_TABLE_VIEW } from './views/FinanceTableView';
import { ChartView, CHART_VIEW_TYPE } from './views/ChartView';
import { FinanceSettings, DEFAULT_SETTINGS } from './settings';
import { SummaryService } from './services/SummaryService';
import { FinanceSummaryView, FINANCE_SUMMARY_VIEW } from './views/FinanceSummaryView';
import { SummaryQueryService } from './services/SummaryQueryService';
import { MarkdownRenderer } from 'obsidian';

export default class FinancePlugin extends Plugin {
	settings: FinanceSettings;
	transactionService: TransactionService;
	budgetService: BudgetService;
	recurringTransactionService: RecurringTransactionService;
	chartService: ChartService;
	excelService: ExcelService;
	summaryService: SummaryService;
	summaryQueryService: SummaryQueryService;
	private chartView: ChartView;

	async onload() {
		await this.loadSettings();

		// 创建服务实例
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
		this.summaryService = new SummaryService(this.app, this.settings, this.transactionService);
		this.summaryQueryService = new SummaryQueryService(this.app, this.summaryService);

		// 初始化服务
		await Promise.all([
			this.transactionService.initialize(),
			this.budgetService.initialize(),
			this.recurringTransactionService.initialize()
		]);

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

		// 注册财务摘要视图
		this.registerView(
			FINANCE_SUMMARY_VIEW,
			(leaf) => new FinanceSummaryView(leaf, this.summaryService)
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
				new AddRecurringTransactionModal(this.app, this.recurringTransactionService, this.transactionService).open();
			}
		});

		this.addCommand({
			id: 'finance:add-budget',
			name: 'Add Budget',
			callback: () => {
				new AddBudgetModal(this.app, this.budgetService, this.transactionService).open();
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

		// 添加财务摘要命令
		this.addCommand({
			id: 'show-finance-summary',
			name: 'Show Finance Summary',
			callback: () => {
				this.activateView();
			}
		});

		// 添加设置标签页
		this.addSettingTab(new FinanceSettingTab(this.app, this));

		// 注册图表代码块
		this.registerMarkdownCodeBlockProcessor('finance', async (source, el, ctx) => {
			const chart = await this.chartService.generateChart(source);
			el.appendChild(chart);
		});

		// 注册财务摘要代码块
		this.registerMarkdownCodeBlockProcessor('finance-summary', async (source, el, ctx) => {
			const markdown = await this.summaryQueryService.processQuery(source);
			const container = el.createDiv('markdown-preview-view markdown-rendered');
			await MarkdownRenderer.renderMarkdown(markdown, container, '', this);
		});

		// 在插件加载时自动添加 Finance Table 到右侧边栏
		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});
	}

	async onunload() {
		// 清理资源
		this.app.workspace.detachLeavesOfType(FINANCE_SUMMARY_VIEW);
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

		containerEl.createEl('h2', {text: 'Finance Note Settings'});

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
			.setName('Finance Note File Path')
			.setDesc('Default path for finance note files')
			.addText(text => text
				.setPlaceholder('Enter finance note file path')
				.setValue(this.plugin.settings.financeFilePath)
				.onChange(async (value) => {
					this.plugin.settings.financeFilePath = value;
					this.plugin.settings.budgetFilePath = value;
					this.plugin.settings.recurringTransactionsFilePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Finance File Path')
			.setDesc('The path where finance files will be stored')
			.addText(text => text
				.setPlaceholder('Enter path')
				.setValue(this.plugin.settings.financeFilePath)
				.onChange(async (value) => {
					this.plugin.settings.financeFilePath = value;
					await this.plugin.saveSettings();
				}));
	}
}

// 模态框类定义
class AddTransactionModal extends Modal {
	private transactionService: TransactionService;
	private amountInput: HTMLInputElement;
	private typeSelect: HTMLSelectElement;
	private categorySelect: HTMLSelectElement;
	private accountSelect: HTMLSelectElement;
	private descriptionInput: HTMLInputElement;
	private dateInput: HTMLInputElement;
	private currencySelect: HTMLSelectElement;

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
		this.categorySelect = categoryGroup.createEl('select');
		const categories = this.transactionService.getCategories();
		categories.forEach(category => {
			this.categorySelect.createEl('option', {text: category, value: category});
		});

		// 账户
		const accountGroup = form.createEl('div', {cls: 'form-group'});
		accountGroup.createEl('label', {text: 'Account'});
		this.accountSelect = accountGroup.createEl('select');
		const accounts = this.transactionService.getAccounts();
		accounts.forEach(account => {
			this.accountSelect.createEl('option', {text: account, value: account});
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
		const settings = this.transactionService.getSettings();
		settings.currencies.forEach(currency => {
			this.currencySelect.createEl('option', {text: currency, value: currency});
		});
		this.currencySelect.value = settings.defaultCurrency;

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
					category: this.categorySelect.value,
					account: this.accountSelect.value,
					description: this.descriptionInput.value,
					currency: this.currencySelect.value
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
	private transactionService: TransactionService;
	private amountInput: HTMLInputElement;
	private typeSelect: HTMLSelectElement;
	private categoryInput: HTMLInputElement;
	private accountInput: HTMLInputElement;
	private descriptionInput: HTMLInputElement;
	private frequencySelect: HTMLSelectElement;
	private startDateInput: HTMLInputElement;
	private endDateInput: HTMLInputElement;
	private currencySelect: HTMLSelectElement;

	constructor(app: App, recurringTransactionService: RecurringTransactionService, transactionService: TransactionService) {
		super(app);
		this.recurringTransactionService = recurringTransactionService;
		this.transactionService = transactionService;
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

		// 货币
		const currencyGroup = form.createEl('div', {cls: 'form-group'});
		currencyGroup.createEl('label', {text: 'Currency'});
		this.currencySelect = currencyGroup.createEl('select');
		const settings = this.transactionService.getSettings();
		settings.currencies.forEach(currency => {
			this.currencySelect.createEl('option', {text: currency, value: currency});
		});
		this.currencySelect.value = settings.defaultCurrency;

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
					currency: this.currencySelect.value
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
	private transactionService: TransactionService;
	private categoryInput: HTMLInputElement;
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

		// 货币
		const currencyGroup = form.createEl('div', {cls: 'form-group'});
		currencyGroup.createEl('label', {text: 'Currency'});
		this.currencySelect = currencyGroup.createEl('select');
		const settings = this.transactionService.getSettings();
		settings.currencies.forEach(currency => {
			this.currencySelect.createEl('option', {text: currency, value: currency});
		});
		this.currencySelect.value = settings.defaultCurrency;

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