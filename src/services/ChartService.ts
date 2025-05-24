import { Chart, ChartConfiguration } from 'chart.js';
import { parse, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { TransactionService } from './TransactionService';

interface ChartTheme {
    name: string;
    colors: string[];
    backgroundColor: string;
    textColor: string;
    gridColor: string;
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
    showBudget?: boolean;
    sort?: {
        field: string;
        direction: 'asc' | 'desc';
        priority: number;
    }[];
    theme: string;
    interactive: boolean;
}

export class ChartService {
    private themes: Map<string, ChartTheme> = new Map();
    private transactionService: TransactionService;

    constructor(transactionService: TransactionService) {
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

    async generateChartFromSource(source: string): Promise<HTMLElement> {
        const config = this.parseChartSource(source);
        const chartElement = document.createElement('canvas');
        const theme = this.themes.get(config.theme) || this.themes.get('default')!;

        // 获取数据
        const data = await this.getChartData(config);
        const labels = data.labels;
        const datasets = data.datasets.map((dataset, index) => ({
            ...dataset,
            borderColor: theme.colors[index % theme.colors.length],
            backgroundColor: theme.colors[index % theme.colors.length] + '80', // 添加透明度
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }));

        const chartConfig: ChartConfiguration = {
            type: config.type,
            data: {
                labels,
                datasets
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
                        enabled: config.interactive,
                        backgroundColor: theme.backgroundColor,
                        titleColor: theme.textColor,
                        bodyColor: theme.textColor,
                        borderColor: theme.gridColor,
                        borderWidth: 1
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: theme.textColor,
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: theme.gridColor
                        },
                        ticks: {
                            color: theme.textColor
                        }
                    },
                    y: {
                        grid: {
                            color: theme.gridColor
                        },
                        ticks: {
                            color: theme.textColor
                        }
                    }
                }
            }
        };

        new Chart(chartElement, chartConfig);

        return chartElement;
    }

    private async getChartData(config: ChartConfig): Promise<{ labels: string[], datasets: any[] }> {
        const now = new Date();
        const startDate = startOfMonth(new Date(now.getFullYear(), 0, 1));
        const endDate = endOfMonth(new Date(now.getFullYear(), 11, 31));

        // 获取所有月份
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        const labels = months.map(month => format(month, 'MMM'));

        // 获取交易数据
        const transactions = await this.transactionService.getTransactions({
            startDate,
            endDate
        });

        // 按月份和类型分组数据
        const incomeData = new Array(12).fill(0);
        const expenseData = new Array(12).fill(0);

        transactions.forEach(transaction => {
            const month = new Date(transaction.date).getMonth();
            if (transaction.type === 'income') {
                incomeData[month] += transaction.amount;
            } else {
                expenseData[month] += transaction.amount;
            }
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData
                },
                {
                    label: 'Expense',
                    data: expenseData
                }
            ]
        };
    }

    private parseChartSource(source: string): ChartConfig {
        // 解析图表源代码，提取配置信息
        const lines = source.split('\n');
        const config: ChartConfig = {
            type: 'bar',
            timeRange: {
                type: 'month'
            },
            theme: 'default',
            interactive: true
        };

        for (const line of lines) {
            const [key, value] = line.split(':').map(s => s.trim());
            switch (key) {
                case 'chart type':
                    config.type = value as ChartConfig['type'];
                    break;
                case 'time':
                    config.timeRange.type = value as ChartConfig['timeRange']['type'];
                    break;
                case 'theme':
                    config.theme = value;
                    break;
                case 'interactive':
                    config.interactive = value === 'true';
                    break;
                // 添加其他配置项的解析
            }
        }

        return config;
    }

    setCustomTheme(theme: ChartTheme): void {
        this.themes.set(theme.name, theme);
    }

    exportChart(chart: Chart, format: 'png' | 'jpg' | 'svg'): Promise<Blob> {
        return new Promise((resolve) => {
            const canvas = chart.canvas;
            const dataUrl = canvas.toDataURL(`image/${format}`);
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => resolve(blob));
        });
    }
} 