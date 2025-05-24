import { ItemView, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';
import { SummaryService } from '../services/SummaryService';
import { format } from 'date-fns';

export const FINANCE_SUMMARY_VIEW = 'finance-summary-view';

export class FinanceSummaryView extends ItemView {
    private summaryService: SummaryService;
    private currentDate: Date = new Date();
    private currentView: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'daily';

    constructor(leaf: WorkspaceLeaf, summaryService: SummaryService) {
        super(leaf);
        this.summaryService = summaryService;
    }

    getViewType(): string {
        return FINANCE_SUMMARY_VIEW;
    }

    getDisplayText(): string {
        return 'Finance Summary';
    }

    async onOpen(): Promise<void> {
        await this.render();
    }

    async render(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('finance-summary-view');

        // 添加控制面板
        const controls = container.createDiv('finance-summary-controls');
        this.addViewControls(controls);
        this.addDateControls(controls);

        // 添加内容区域
        const content = container.createDiv('finance-summary-content');
        await this.renderSummary(content);
    }

    private addViewControls(container: HTMLElement): void {
        const viewControls = container.createDiv('view-controls');
        const views: Array<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'> = 
            ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

        views.forEach(view => {
            const button = viewControls.createEl('button', {
                text: view.charAt(0).toUpperCase() + view.slice(1),
                cls: this.currentView === view ? 'is-active' : ''
            });
            button.addEventListener('click', () => {
                this.currentView = view;
                this.render();
            });
        });
    }

    private addDateControls(container: HTMLElement): void {
        const dateControls = container.createDiv('date-controls');
        
        // 上一期按钮
        const prevButton = dateControls.createEl('button', { text: '←' });
        prevButton.addEventListener('click', () => {
            this.navigateDate(-1);
        });

        // 日期显示
        const dateDisplay = dateControls.createDiv('date-display');
        this.updateDateDisplay(dateDisplay);

        // 下一期按钮
        const nextButton = dateControls.createEl('button', { text: '→' });
        nextButton.addEventListener('click', () => {
            this.navigateDate(1);
        });
    }

    private updateDateDisplay(element: HTMLElement): void {
        let dateText = '';
        switch (this.currentView) {
            case 'daily':
                dateText = format(this.currentDate, 'yyyy-MM-dd');
                break;
            case 'weekly':
                dateText = `Week of ${format(this.currentDate, 'yyyy-MM-dd')}`;
                break;
            case 'monthly':
                dateText = format(this.currentDate, 'yyyy-MM');
                break;
            case 'quarterly':
                dateText = `Q${Math.floor(this.currentDate.getMonth() / 3) + 1} ${format(this.currentDate, 'yyyy')}`;
                break;
            case 'yearly':
                dateText = format(this.currentDate, 'yyyy');
                break;
        }
        element.setText(dateText);
    }

    private navigateDate(direction: number): void {
        switch (this.currentView) {
            case 'daily':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
            case 'weekly':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'monthly':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'quarterly':
                this.currentDate.setMonth(this.currentDate.getMonth() + (direction * 3));
                break;
            case 'yearly':
                this.currentDate.setFullYear(this.currentDate.getFullYear() + direction);
                break;
        }
        this.render();
    }

    private async renderSummary(container: HTMLElement): Promise<void> {
        let summary;
        switch (this.currentView) {
            case 'daily':
                summary = await this.summaryService.getDailySummary(this.currentDate);
                break;
            case 'weekly':
                summary = await this.summaryService.getWeeklySummary(this.currentDate);
                break;
            case 'monthly':
                summary = await this.summaryService.getMonthlySummary(this.currentDate);
                break;
            case 'quarterly':
                summary = await this.summaryService.getQuarterlySummary(this.currentDate);
                break;
            case 'yearly':
                summary = await this.summaryService.getYearlySummary(this.currentDate);
                break;
        }

        if (!summary) return;

        // 创建 Markdown 渲染容器
        const markdownContainer = container.createDiv('markdown-preview-view markdown-rendered');
        await MarkdownRenderer.renderMarkdown(summary.markdown, markdownContainer, '', this);
    }
} 