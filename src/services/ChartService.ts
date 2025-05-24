import { Chart, ChartConfiguration, ChartData } from 'chart.js/auto';
import { App, MarkdownView } from 'obsidian';
import { parse, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { TransactionService } from './TransactionService';
import { Transaction } from '../types/Transaction';

interface ChartTheme {
    name: string;
    colors: string[];
    backgroundColor: string;
    textColor: string;
    gridColor: string;
}

interface NumberFormatConfig {
    style?: 'decimal' | 'currency' | 'percent';
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

interface ChartConfig {
    type: 'bar' | 'line' | 'pie' | 'doughnut';
    timeRange: {
        type: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'range';
        start?: Date;
        end?: Date;
    };
    categories?: string[];
    accounts?: string[];
    dimensions?: {
        x: 'date' | 'category' | 'account' | 'type';
        y: 'amount' | 'count';
        groupBy?: ('category' | 'account' | 'type')[];
    };
    display?: {
        title?: string;
        xAxisLabel?: string;
        yAxisLabel?: string;
        showLegend?: boolean;
        showGrid?: boolean;
        showTooltip?: boolean;
        numberFormat?: NumberFormatConfig;
        dateFormat?: string;
    };
    showBudget?: boolean;
    sort?: {
        field: keyof Transaction;
        direction: 'asc' | 'desc';
        priority: number;
    }[];
    theme: string;
    interactive: boolean;
}

export class ChartService {
    private themes: Map<string, ChartTheme>;
    private activeCharts: Map<HTMLElement, Chart>;
    private app: App;
    private transactionService: TransactionService;

    constructor(app: App, transactionService: TransactionService) {
        this.app = app;
        this.activeCharts = new Map();
        this.themes = new Map();
        this.transactionService = transactionService;
        this.initializeThemes();
    }

    private initializeThemes() {
        // 默认主题
        this.themes.set('default', {
            name: 'default',
            colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f'],
            backgroundColor: '#ffffff',
            textColor: '#333333',
            gridColor: '#e0e0e0'
        });

        // 暗色主题
        this.themes.set('dark', {
            name: 'dark',
            colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f'],
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff',
            gridColor: '#333333'
        });

        // 浅色主题
        this.themes.set('light', {
            name: 'light',
            colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f'],
            backgroundColor: '#f5f5f5',
            textColor: '#333333',
            gridColor: '#e0e0e0'
        });
    }

    // 解析图表查询语法
    parseChartQuery(query: string): ChartConfig {
        // 示例查询语法：
        // ```chart
        // type: bar
        // timeRange: month
        // dimensions:
        //   x: date
        //   y: amount
        //   groupBy: category
        // display:
        //   title: 月度支出分析
        //   xAxisLabel: 日期
        //   yAxisLabel: 金额（元）
        //   showLegend: true
        //   showGrid: true
        //   showTooltip: true
        //   numberFormat:
        //     style: currency
        //     currency: CNY
        //     minimumFractionDigits: 2
        //   dateFormat: yyyy-MM-dd
        // categories: food,transport
        // accounts: cash,bank
        // showBudget: true
        // sort: amount desc
        // theme: dark
        // ```
        const lines = query.split('\n');
        const config: ChartConfig = {
            type: 'bar',
            timeRange: { type: 'month' },
            theme: 'default',
            interactive: true,
            dimensions: {
                x: 'date',
                y: 'amount'
            },
            display: {
                showLegend: true,
                showGrid: true,
                showTooltip: true,
                numberFormat: {
                    style: 'currency',
                    currency: 'CNY',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                },
                dateFormat: 'yyyy-MM-dd'
            }
        };

        // 定义有效的排序字段
        const validSortFields: (keyof Transaction)[] = ['date', 'amount', 'type', 'category', 'account', 'description', 'currency', 'id'];
        let currentSection: string | null = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // 检查是否是新的配置节
            if (trimmedLine.endsWith(':')) {
                currentSection = trimmedLine.slice(0, -1).trim();
                continue;
            }

            // 处理缩进的配置项
            if (currentSection === 'dimensions') {
                const [key, value] = trimmedLine.split(':').map(s => s.trim());
                if (!config.dimensions) {
                    config.dimensions = { x: 'date', y: 'amount' };
                }
                switch (key) {
                    case 'x':
                        if (['date', 'category', 'account', 'type'].includes(value)) {
                            config.dimensions.x = value as 'date' | 'category' | 'account' | 'type';
                        }
                        break;
                    case 'y':
                        if (['amount', 'count'].includes(value)) {
                            config.dimensions.y = value as 'amount' | 'count';
                        }
                        break;
                    case 'groupBy':
                        config.dimensions.groupBy = value.split(',').map(s => s.trim()) as ('category' | 'account' | 'type')[];
                        break;
                }
                continue;
            }

            if (currentSection === 'display') {
                const [key, value] = trimmedLine.split(':').map(s => s.trim());
                if (!config.display) {
                    config.display = {};
                }
                switch (key) {
                    case 'title':
                        config.display.title = value;
                        break;
                    case 'xAxisLabel':
                        config.display.xAxisLabel = value;
                        break;
                    case 'yAxisLabel':
                        config.display.yAxisLabel = value;
                        break;
                    case 'showLegend':
                        config.display.showLegend = value.toLowerCase() === 'true';
                        break;
                    case 'showGrid':
                        config.display.showGrid = value.toLowerCase() === 'true';
                        break;
                    case 'showTooltip':
                        config.display.showTooltip = value.toLowerCase() === 'true';
                        break;
                    case 'dateFormat':
                        config.display.dateFormat = value;
                        break;
                }
                continue;
            }

            if (currentSection === 'numberFormat') {
                const [key, value] = trimmedLine.split(':').map(s => s.trim());
                if (!config.display) {
                    config.display = {};
                }
                if (!config.display.numberFormat) {
                    config.display.numberFormat = {};
                }
                switch (key) {
                    case 'style':
                        if (['decimal', 'currency', 'percent'].includes(value)) {
                            config.display.numberFormat.style = value as 'decimal' | 'currency' | 'percent';
                        }
                        break;
                    case 'currency':
                        config.display.numberFormat.currency = value;
                        break;
                    case 'minimumFractionDigits':
                        config.display.numberFormat.minimumFractionDigits = parseInt(value);
                        break;
                    case 'maximumFractionDigits':
                        config.display.numberFormat.maximumFractionDigits = parseInt(value);
                        break;
                }
                continue;
            }

            // 处理普通配置项
            const [key, value] = trimmedLine.split(':').map(s => s.trim());
            switch (key) {
                case 'type':
                    if (['bar', 'line', 'pie', 'doughnut'].includes(value)) {
                        config.type = value as ChartConfig['type'];
                    }
                    break;
                case 'timeRange':
                    if (['day', 'week', 'month', 'quarter', 'year', 'range'].includes(value)) {
                        config.timeRange.type = value as ChartConfig['timeRange']['type'];
                    }
                    break;
                case 'categories':
                    config.categories = value.split(',').map(s => s.trim());
                    break;
                case 'accounts':
                    config.accounts = value.split(',').map(s => s.trim());
                    break;
                case 'showBudget':
                    config.showBudget = value.toLowerCase() === 'true';
                    break;
                case 'sort':
                    const [field, direction] = value.split(' ');
                    if (validSortFields.includes(field as keyof Transaction)) {
                        config.sort = [{
                            field: field as keyof Transaction,
                            direction: direction.toLowerCase() as 'asc' | 'desc',
                            priority: 0
                        }];
                    }
                    break;
                case 'theme':
                    if (this.themes.has(value)) {
                        config.theme = value;
                    }
                    break;
            }
        }

        return config;
    }

    // 生成图表
    async generateChart(query: string): Promise<HTMLElement> {
        try {
            const config = this.parseChartQuery(query);
            const chartElement = document.createElement('canvas');
            
            // 创建容器
            const container = document.createElement('div');
            container.style.width = '100%';
            container.style.height = '400px';
            container.appendChild(chartElement);
            
            const theme = this.themes.get(config.theme) || this.themes.get('default')!;
            
            // 获取数据
            const data = await this.getChartData(config);
            if (!data || !data.labels || !data.datasets) {
                throw new Error('Invalid chart data');
            }

            // 获取维度配置
            const { x, y, groupBy } = config.dimensions || { x: 'date', y: 'amount' };
            
            // 生成坐标轴标签
            const axisLabels = this.generateAxisLabels(x, y, groupBy, config.display);
            
            const datasets = data.datasets.map((dataset, index) => ({
                ...dataset,
                borderColor: theme.colors[index % theme.colors.length],
                backgroundColor: theme.colors[index % theme.colors.length] + '80',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }));

            const chartConfig: ChartConfiguration = {
                type: config.type,
                data: {
                    labels: data.labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart'
                    },
                    interaction: {
                        mode: 'nearest',
                        intersect: false
                    },
                    plugins: {
                        tooltip: {
                            enabled: config.display?.showTooltip ?? true,
                            backgroundColor: theme.backgroundColor,
                            titleColor: theme.textColor,
                            bodyColor: theme.textColor,
                            borderColor: theme.gridColor,
                            borderWidth: 1,
                            callbacks: {
                                title: (items) => {
                                    const item = items[0];
                                    const label = item.label;
                                    return `${axisLabels.x}: ${label}`;
                                },
                                label: (item) => {
                                    const dataset = datasets[item.datasetIndex];
                                    const value = item.raw as number;
                                    return `${dataset.label}: ${this.formatNumber(value, config.display?.numberFormat)}`;
                                }
                            }
                        },
                        legend: {
                            display: config.display?.showLegend ?? true,
                            position: 'top',
                            labels: {
                                color: theme.textColor,
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        title: {
                            display: true,
                            text: config.display?.title || this.generateChartTitle(x, y, groupBy),
                            color: theme.textColor,
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: {
                                top: 10,
                                bottom: 20
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: config.display?.showGrid ?? true,
                                color: theme.gridColor
                            },
                            ticks: {
                                color: theme.textColor
                            },
                            title: {
                                display: true,
                                text: config.display?.xAxisLabel || axisLabels.x,
                                color: theme.textColor,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        y: {
                            grid: {
                                display: config.display?.showGrid ?? true,
                                color: theme.gridColor
                            },
                            ticks: {
                                color: theme.textColor,
                                callback: (value) => {
                                    return this.formatNumber(value as number, config.display?.numberFormat);
                                }
                            },
                            title: {
                                display: true,
                                text: config.display?.yAxisLabel || axisLabels.y,
                                color: theme.textColor,
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        }
                    }
                }
            };

            // 创建图表实例
            const chart = new Chart(chartElement, chartConfig);
            this.activeCharts.set(chartElement, chart);
            
            return container;
        } catch (error) {
            console.error('Error generating chart:', error);
            throw error;
        }
    }

    // 格式化数字
    private formatNumber(value: number, format?: NumberFormatConfig): string {
        if (!format) {
            return value.toLocaleString();
        }

        const defaultFormat = {
            style: 'decimal' as const,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };

        const options: Intl.NumberFormatOptions = {
            style: format.style || defaultFormat.style,
            minimumFractionDigits: format.minimumFractionDigits ?? defaultFormat.minimumFractionDigits,
            maximumFractionDigits: format.maximumFractionDigits ?? defaultFormat.maximumFractionDigits
        };

        if (format.style === 'currency' && format.currency) {
            options.currency = format.currency;
        }

        return new Intl.NumberFormat('zh-CN', options).format(value);
    }

    // 生成坐标轴标签
    private generateAxisLabels(
        xDimension: 'date' | 'category' | 'account' | 'type',
        yDimension: 'amount' | 'count',
        groupBy?: ('category' | 'account' | 'type')[],
        display?: ChartConfig['display']
    ): { x: string; y: string } {
        type DisplayType = NonNullable<ChartConfig['display']>;
        const defaultDisplay: Partial<DisplayType> = {
            xAxisLabel: undefined,
            yAxisLabel: undefined
        };

        const safeDisplay = (display || defaultDisplay) as Partial<DisplayType>;

        if (safeDisplay.xAxisLabel && safeDisplay.yAxisLabel) {
            return {
                x: safeDisplay.xAxisLabel,
                y: safeDisplay.yAxisLabel
            };
        }

        const xLabels: Record<string, string> = {
            date: '日期',
            category: '类别',
            account: '账户',
            type: '类型'
        };

        const yLabels: Record<string, string> = {
            amount: '金额',
            count: '数量'
        };

        return {
            x: safeDisplay.xAxisLabel || xLabels[xDimension] || xDimension,
            y: safeDisplay.yAxisLabel || yLabels[yDimension] || yDimension
        };
    }

    // 生成图表标题
    private generateChartTitle(
        xDimension: 'date' | 'category' | 'account' | 'type',
        yDimension: 'amount' | 'count',
        groupBy?: ('category' | 'account' | 'type')[]
    ): string {
        const xLabels: Record<string, string> = {
            date: '日期',
            category: '类别',
            account: '账户',
            type: '类型'
        };

        const yLabels: Record<string, string> = {
            amount: '金额',
            count: '数量'
        };

        const groupLabels: Record<string, string> = {
            category: '类别',
            account: '账户',
            type: '类型'
        };

        let title = `${yLabels[yDimension]}统计`;
        
        if (groupBy && groupBy.length > 0) {
            title += `（按${groupLabels[groupBy[0]]}分组）`;
        }
        
        title += ` - ${xLabels[xDimension]}分布`;

        return title;
    }

    // 获取图表数据
    private async getChartData(config: ChartConfig): Promise<ChartData> {
        try {
            console.log('Chart config:', config);

            // 计算时间范围
            const now = new Date();
            let startDate: Date | undefined;
            let endDate: Date | undefined;

            switch (config.timeRange.type) {
                case 'day':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    endDate = new Date(now.setHours(23, 59, 59, 999));
                    break;
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                    endDate = new Date(now.setDate(now.getDate() + 6));
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    break;
                case 'range':
                    startDate = config.timeRange.start;
                    endDate = config.timeRange.end;
                    break;
            }

            console.log('Time range:', { startDate, endDate });

            // 获取交易数据
            const transactions = await this.transactionService.getTransactions({
                startDate,
                endDate,
                categories: config.categories,
                accounts: config.accounts,
                types: ['income', 'expense'],
                sort: config.sort
            });

            console.log('Transactions count:', transactions.length);
            if (transactions.length === 0) {
                // 如果没有数据，返回空图表数据
                return {
                    labels: [],
                    datasets: [{
                        label: 'No Data',
                        data: []
                    }]
                };
            }

            // 根据维度配置处理数据
            const { x, y, groupBy } = config.dimensions || { x: 'date', y: 'amount' };
            console.log('Dimensions:', { x, y, groupBy });

            const data = this.processChartData(transactions, x, y, groupBy);
            console.log('Processed chart data:', data);

            // 验证数据
            if (!data.labels || !data.datasets || data.labels.length === 0 || data.datasets.length === 0) {
                console.warn('Generated empty chart data');
                return {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'No Data',
                        data: [0]
                    }]
                };
            }

            return data;
        } catch (error) {
            console.error('Error fetching chart data:', error);
            throw error;
        }
    }

    // 处理图表数据
    private processChartData(
        transactions: Transaction[],
        xDimension: 'date' | 'category' | 'account' | 'type',
        yDimension: 'amount' | 'count',
        groupBy?: ('category' | 'account' | 'type')[]
    ): ChartData {
        console.log('Processing chart data with dimensions:', { xDimension, yDimension, groupBy });

        // 如果没有分组，直接按 x 维度聚合
        if (!groupBy || groupBy.length === 0) {
            const aggregated = this.aggregateData(transactions, xDimension, yDimension);
            console.log('Aggregated data:', aggregated);

            const labels = Object.keys(aggregated);
            const data = Object.values(aggregated);

            if (labels.length === 0) {
                console.warn('No data after aggregation');
                return {
                    labels: ['No Data'],
                    datasets: [{
                        label: yDimension === 'amount' ? 'Amount' : 'Count',
                        data: [0]
                    }]
                };
            }

            return {
                labels,
                datasets: [{
                    label: yDimension === 'amount' ? 'Amount' : 'Count',
                    data
                }]
            };
        }

        // 按分组维度处理数据
        const groupedData = new Map<string, Map<string, number>>();
        
        // 初始化分组
        const groups = this.getUniqueValues(transactions, groupBy[0]);
        console.log('Groups:', groups);
        groups.forEach(group => {
            groupedData.set(group, new Map());
        });

        // 聚合数据
        transactions.forEach(transaction => {
            const groupValue = this.getDimensionValue(transaction, groupBy[0]);
            const xValue = this.getDimensionValue(transaction, xDimension);
            const yValue = yDimension === 'amount' ? transaction.amount : 1;

            const groupMap = groupedData.get(groupValue)!;
            groupMap.set(xValue, (groupMap.get(xValue) || 0) + yValue);
        });

        // 转换为图表数据格式
        const labels = Array.from(new Set(
            Array.from(groupedData.values())
                .flatMap(map => Array.from(map.keys()))
        )).sort();

        console.log('Grouped data labels:', labels);

        if (labels.length === 0) {
            console.warn('No data after grouping');
            return {
                labels: ['No Data'],
                datasets: groups.map(group => ({
                    label: group,
                    data: [0]
                }))
            };
        }

        const datasets = Array.from(groupedData.entries()).map(([group, data]) => ({
            label: group,
            data: labels.map(label => data.get(label) || 0)
        }));

        console.log('Final datasets:', datasets);

        return { labels, datasets };
    }

    private aggregateData(
        transactions: Transaction[],
        xDimension: 'date' | 'category' | 'account' | 'type',
        yDimension: 'amount' | 'count'
    ): Record<string, number> {
        const aggregated: Record<string, number> = {};

        transactions.forEach(transaction => {
            const xValue = this.getDimensionValue(transaction, xDimension);
            const yValue = yDimension === 'amount' ? transaction.amount : 1;
            aggregated[xValue] = (aggregated[xValue] || 0) + yValue;
        });

        return aggregated;
    }

    private getDimensionValue(transaction: Transaction, dimension: 'date' | 'category' | 'account' | 'type'): string {
        switch (dimension) {
            case 'date':
                return format(transaction.date, 'yyyy-MM-dd');
            case 'category':
                return transaction.category;
            case 'account':
                return transaction.account;
            case 'type':
                return transaction.type;
            default:
                return '';
        }
    }

    private getUniqueValues(transactions: Transaction[], dimension: 'category' | 'account' | 'type'): string[] {
        return Array.from(new Set(transactions.map(t => this.getDimensionValue(t, dimension))));
    }

    // 更新图表数据
    async updateChartData(chartElement: HTMLElement, query: string) {
        try {
            const config = this.parseChartQuery(query);
            const newData = await this.getChartData(config);
            this.updateChart(chartElement, newData);
        } catch (error) {
            console.error('Error updating chart data:', error);
            throw error;
        }
    }

    // 导出图表为图片
    async exportChart(chartElement: HTMLElement, format: 'png' | 'jpg' | 'svg'): Promise<Blob> {
        const chart = this.activeCharts.get(chartElement);
        if (!chart) {
            throw new Error('Chart not found');
        }

        return new Promise((resolve) => {
            const canvas = chart.canvas;
            const dataUrl = canvas.toDataURL(`image/${format}`);
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => resolve(blob));
        });
    }

    // 更新图表数据
    updateChart(chartElement: HTMLElement, newData: ChartData) {
        const chart = this.activeCharts.get(chartElement);
        if (chart) {
            chart.data = newData;
            chart.update();
        }
    }

    // 销毁图表
    destroyChart(chartElement: HTMLElement) {
        const chart = this.activeCharts.get(chartElement);
        if (chart) {
            chart.destroy();
            this.activeCharts.delete(chartElement);
        }
    }

    setCustomTheme(theme: ChartTheme): void {
        this.themes.set(theme.name, theme);
    }
} 