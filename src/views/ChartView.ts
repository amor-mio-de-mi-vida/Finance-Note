import { ItemView, WorkspaceLeaf } from 'obsidian';
import { ChartService } from '../services/ChartService';
import { EventBus, EVENT_TYPES } from '../services/EventBus';

export const CHART_VIEW_TYPE = 'finance-chart-view';

export class ChartView extends ItemView {
    static icon = 'dollar-sign';
    private chartService: ChartService;
    private chartContainer: HTMLElement;
    private currentQuery: string;
    private eventBus: EventBus;

    constructor(leaf: WorkspaceLeaf, chartService: ChartService) {
        super(leaf);
        this.chartService = chartService;
        this.eventBus = EventBus.getInstance();
        this.currentQuery = '';
    }

    getViewType(): string {
        return CHART_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Finance Chart';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('finance-chart-view');

        // 创建图表容器
        this.chartContainer = container.createDiv('chart-container');
        
        // 监听交易数据变化
        const handleTransactionChange = () => {
            if (this.currentQuery) {
                this.renderChart(this.currentQuery);
            }
        };
        this.eventBus.subscribe(EVENT_TYPES.TRANSACTION_CHANGED, handleTransactionChange);
    }

    async onClose(): Promise<void> {
        // 清理事件监听
        const handleTransactionChange = () => {
            if (this.currentQuery) {
                this.renderChart(this.currentQuery);
            }
        };
        this.eventBus.unsubscribe(EVENT_TYPES.TRANSACTION_CHANGED, handleTransactionChange);
        
        // 清理图表
        const charts = this.chartContainer.querySelectorAll('canvas');
        charts.forEach(canvas => {
            this.chartService.destroyChart(canvas);
        });
    }

    // 渲染图表
    async renderChart(query: string): Promise<void> {
        try {
            this.currentQuery = query;
            
            // 清理现有图表
            const charts = this.chartContainer.querySelectorAll('canvas');
            charts.forEach(canvas => {
                this.chartService.destroyChart(canvas);
            });

            // 生成新图表
            const chartElement = await this.chartService.generateChart(query);
            this.chartContainer.appendChild(chartElement);
        } catch (error) {
            console.error('Error rendering chart:', error);
            this.chartContainer.innerHTML = `<div class="error">Error rendering chart: ${error.message}</div>`;
        }
    }

    // 更新图表查询
    async updateChartQuery(query: string): Promise<void> {
        await this.renderChart(query);
    }

    // 导出图表
    async exportChart(format: 'png' | 'jpg' | 'svg'): Promise<void> {
        const canvas = this.chartContainer.querySelector('canvas');
        if (!canvas) {
            throw new Error('No chart to export');
        }

        try {
            const blob = await this.chartService.exportChart(canvas, format);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chart.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting chart:', error);
            throw error;
        }
    }
} 