# Finance Note - Obsidian Plugin

Finance Note 是一个强大的 Obsidian 插件，用于个人财务管理。它提供了直观的界面和丰富的功能，帮助用户轻松管理个人财务，包括交易记录、预算管理、定期交易和财务分析等。

## ✨ 特性

### 📝 基础功能
- **交易记录管理**
  - 支持多种交易类型：
    - 收入（Income）
    - 支出（Expense）
    - 资产（Asset）
    - 负债（Liability）
  - 每条记录包含：金额、时间、类型、分类、账户、描述等信息
  - 支持多币种（无需汇率换算）
  - 完整的增删改查功能
  - 支持按时间、金额等多维度排序

- **账户管理**
  - 支持多种账户类型（收入账户、支出账户、资产账户、负债账户等）
  - 账户的增删改查功能
  - 支持账户交易历史记录

- **分类管理**
  - 自定义交易分类
  - 分类的增删改查功能
  - 分类统计和分析

- **预算管理**
  - 支持多种预算类型：
    - 月度预算（按月设置各类支出上限）
    - 年度预算（支持按季度/月度分配）
    - 分类预算（针对特定分类设置预算）
    - 账户预算（针对特定账户设置预算上限）
  - 预算功能：
    - 预算预警
    - 预算执行率
    - 预算调整
    - 预算结转（可选）
  - 预算展示：
    - 预算使用进度条
    - 预算执行率图表
    - 预算vs实际支出对比

- **定期交易**
  - 支持多种周期（日、周、月、季、年）
  - 定期交易的增删改查
  - 支持暂停/恢复功能
  - 支持提前终止
  - 支持修改历史记录

### 📊 数据可视化
- **图表展示**
  - 支持多种图表类型：
    - 柱状图
    - 折线图
    - 饼图
    - 环形图
  - 多维度数据展示：
    - 时间维度（日、周、月、季、年）
    - 账户维度
    - 分类维度
  - 图表特性：
    - 自定义颜色主题
    - 动画效果
    - 响应式布局
    - 交互功能（点击查看详情、悬停显示数据）

### 📁 数据管理
- **数据存储**
  - 使用 Obsidian Markdown 文件存储
  - 按年份组织数据（YYYY.finance.md）
  - 支持 Obsidian 的链接和搜索功能

- **数据导入导出**
  - 支持 Excel 导入导出
  - 提供标准 Excel 模板
  - 支持 CSV 导出
  - 导入时数据验证和错误提示
  - 支持自定义导出字段

### ⚙️ 用户配置
- **设置选项**
  - 默认货币设置
  - 默认账户设置
  - 默认分类设置
  - 文件路径配置
- **配置管理**
  - 支持配置导入导出
  - 支持配置备份恢复
  - 支持恢复默认配置

## 🚀 安装

1. 打开 Obsidian 设置
2. 进入第三方插件
3. 关闭安全模式
4. 点击浏览社区插件
5. 搜索 "Finance Note"
6. 点击安装
7. 启用插件

## 📖 使用指南

### 基本操作
1. **添加交易记录**
   - 使用命令面板（Ctrl/Cmd + P）
   - 点击侧边栏的添加按钮
   - 使用快捷键（可在设置中配置）

2. **查看财务数据**
   - 打开侧边栏面板
   - 使用图表视图
   - 使用搜索功能

3. **管理预算**
   - 在侧边栏面板中切换到预算视图
   - 添加/编辑预算
   - 查看预算执行情况

4. **设置定期交易**
   - 在侧边栏面板中切换到定期交易视图
   - 添加/编辑定期交易
   - 管理定期交易状态

### 使用示例

#### 1. 交易记录示例

**添加交易记录**
```markdown
```finance-transaction
date: 2024-03-20
amount: 100.50
type: expense
category: 餐饮
account: 支付宝
description: 午餐
currency: CNY
```
```

**添加资产记录**
```markdown
```finance-transaction
date: 2024-03-20
amount: 100000.00
type: asset
category: 股票
account: 证券账户
description: 购买腾讯股票
currency: CNY
```
```

**添加负债记录**
```markdown
```finance-transaction
date: 2024-03-20
amount: 500000.00
type: liability
category: 房贷
account: 建设银行
description: 购房贷款
currency: CNY
```
```

**批量导入交易记录**
```markdown
```finance-transaction-batch
[
  {
    "date": "2024-03-20",
    "amount": 100.50,
    "type": "expense",
    "category": "餐饮",
    "account": "支付宝",
    "description": "午餐",
    "currency": "CNY"
  },
  {
    "date": "2024-03-20",
    "amount": 5000.00,
    "type": "income",
    "category": "工资",
    "account": "工商银行",
    "description": "3月工资",
    "currency": "CNY"
  },
  {
    "date": "2024-03-20",
    "amount": 100000.00,
    "type": "asset",
    "category": "股票",
    "account": "证券账户",
    "description": "购买腾讯股票",
    "currency": "CNY"
  },
  {
    "date": "2024-03-20",
    "amount": 500000.00,
    "type": "liability",
    "category": "房贷",
    "account": "建设银行",
    "description": "购房贷款",
    "currency": "CNY"
  }
]
```
```

#### 2. 预算管理示例

**添加月度预算**
```markdown
```finance-budget
type: monthly
year: 2024
month: 3
category: 餐饮
amount: 2000.00
description: 3月餐饮预算
```
```

**添加年度预算**
```markdown
```finance-budget
type: yearly
year: 2024
category: 交通
amount: 12000.00
description: 2024年交通预算
quarterly_allocation: [3000, 3000, 3000, 3000]
```
```

**添加分类预算**
```markdown
```finance-budget
type: category
category: 娱乐
amount: 5000.00
period: monthly
description: 每月娱乐支出预算
```
```

#### 3. 定期交易示例

**添加每月固定支出**
```markdown
```finance-recurring
type: expense
amount: 2000.00
category: 房租
account: 工商银行
frequency: monthly
start_date: 2024-01-01
end_date: 2024-12-31
description: 每月房租
currency: CNY
```
```

**添加每周固定收入**
```markdown
```finance-recurring
type: income
amount: 500.00
category: 兼职
account: 支付宝
frequency: weekly
start_date: 2024-01-01
description: 每周兼职收入
currency: CNY
```
```

#### 4. 图表展示示例

**月度收支趋势图**
```markdown
```finance
type: line
dimensions: 
  x: date
  y: amount
display:
  title: "2024年月度收支趋势"
  theme: light
  colors:
    income: "#4CAF50"
    expense: "#F44336"
filter:
  startDate: 2024-01-01
  endDate: 2024-12-31
  groupBy: month
```
```

**分类支出占比**
```markdown
```finance
type: pie
dimensions:
  category: amount
display:
  title: "2024年3月支出分类占比"
  theme: dark
  showPercentage: true
filter:
  startDate: 2024-03-01
  endDate: 2024-03-31
  type: expense
```
```

**账户余额变化**
```markdown
```finance
type: bar
dimensions:
  x: date
  y: balance
display:
  title: "账户余额变化"
  theme: light
  stack: false
filter:
  account: "工商银行"
  startDate: 2024-01-01
  endDate: 2024-03-31
  groupBy: week
```
```

**预算执行情况**
```markdown
```finance
type: bar
dimensions:
  x: category
  y: [budget, actual]
display:
  title: "2024年3月预算执行情况"
  theme: light
  showLegend: true
filter:
  startDate: 2024-03-01
  endDate: 2024-03-31
  type: expense
```
```

#### 5. 数据导出示例

**导出月度报表**
```markdown
```finance-export
type: excel
format: monthly
period: 2024-03
include:
  - transactions
  - budgets
  - recurring
  - charts
output: "2024-03财务报告.xlsx"
```
```

**导出年度汇总**
```markdown
```finance-export
type: excel
format: yearly
year: 2024
include:
  - transactions
  - budgets
  - recurring
  - charts
  - summary
output: "2024年度财务报告.xlsx"
```
```

### 高级功能

#### 1. 自定义视图
```markdown
```finance-view
name: "月度概览"
layout: grid
components:
  - type: chart
    chart: "月度收支趋势"
    width: 2
  - type: chart
    chart: "分类支出占比"
    width: 1
  - type: table
    data: "本月交易"
    width: 2
  - type: progress
    data: "预算执行"
    width: 1
```
```

#### 2. 数据筛选
```markdown
```finance-filter
type: transaction
conditions:
  - field: amount
    operator: ">"
    value: 1000
  - field: category
    operator: "in"
    value: ["餐饮", "交通"]
  - field: date
    operator: "between"
    value: ["2024-03-01", "2024-03-31"]
sort:
  - field: date
    order: desc
  - field: amount
    order: desc
```
```

## 🔧 配置说明

### 基本设置
- **Finance Note File Path**: 设置财务数据文件的存储路径
- **Default Currency**: 设置默认货币
- **Default Account**: 设置默认账户
- **Default Categories**: 设置默认分类

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Obsidian](https://obsidian.md/) - 优秀的笔记应用
- [Chart.js](https://www.chartjs.org/) - 强大的图表库
- 所有为本项目做出贡献的开发者

## 📞 支持

如果您遇到任何问题或有任何建议，请：

1. 查看 [文档](docs/)
2. 在 [Issues](https://github.com/yourusername/finance-note/issues) 中搜索
3. 创建新的 Issue

---

如果您觉得这个项目对您有帮助，请给一个 ⭐️ 支持我们！

## 🏗️ 项目结构

```
finance-note/
├── src/
│   ├── components/        # UI 组件
│   ├── services/         # 业务逻辑服务
│   ├── types/           # TypeScript 类型定义
│   ├── utils/           # 工具函数
│   ├── modals/          # 模态框组件
│   └── views/           # 视图组件
├── styles/              # CSS 样式文件
├── tests/              # 测试文件
├── docs/               # 文档
└── manifest.json       # 插件清单
```

## 💻 开发环境设置

### 前置要求
- Node.js >= 16
- npm >= 7
- Obsidian >= 1.0.0

### 安装步骤
1. 克隆仓库
```bash
git clone https://github.com/yourusername/finance-note.git
cd finance-note
```

2. 安装依赖
```bash
npm install
```

3. 开发模式
```bash
npm run dev
```

4. 构建插件
```bash
npm run build
```

## 📚 API 文档

### 交易记录 API

#### 添加交易
```typescript
interface Transaction {
    date: Date;
    amount: number;
    type: 'income' | 'expense' | 'asset' | 'liability';
    category: string;
    account: string;
    description?: string;
    currency: string;
}

// 添加单笔交易
addTransaction(transaction: Transaction): Promise<void>;

// 批量添加交易
addTransactions(transactions: Transaction[]): Promise<void>;
```

#### 查询交易
```typescript
// 获取指定时间范围的交易
getTransactions(startDate: Date, endDate: Date): Promise<Transaction[]>;

// 按类型获取交易
getTransactionsByType(type: TransactionType): Promise<Transaction[]>;

// 按账户获取交易
getTransactionsByAccount(account: string): Promise<Transaction[]>;
```

### 预算管理 API

#### 预算操作
```typescript
interface Budget {
    type: 'monthly' | 'yearly' | 'category';
    amount: number;
    category: string;
    period: string;
    description?: string;
}

// 添加预算
addBudget(budget: Budget): Promise<void>;

// 更新预算
updateBudget(id: string, budget: Budget): Promise<void>;

// 获取预算执行情况
getBudgetStatus(budgetId: string): Promise<BudgetStatus>;
```

### 定期交易 API

#### 定期交易操作
```typescript
interface RecurringTransaction {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    account: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    description?: string;
    currency: string;
}

// 添加定期交易
addRecurringTransaction(transaction: RecurringTransaction): Promise<void>;

// 暂停定期交易
pauseRecurringTransaction(id: string): Promise<void>;

// 恢复定期交易
resumeRecurringTransaction(id: string): Promise<void>;
```

### 数据可视化 API

#### 图表生成
```typescript
interface ChartConfig {
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    dimensions: {
        x?: string;
        y?: string;
        category?: string;
    };
    display: {
        title: string;
        theme: 'light' | 'dark';
        colors?: Record<string, string>;
    };
    filter: {
        startDate?: Date;
        endDate?: Date;
        type?: string;
        groupBy?: string;
    };
}

// 生成图表
generateChart(config: ChartConfig): Promise<Chart>;
```

## 🔍 调试指南

### 开发工具
- 使用 Obsidian 开发者工具（Ctrl/Cmd + Shift + I）
- 查看控制台日志
- 使用断点调试

### 常见问题
1. **插件无法加载**
   - 检查 manifest.json 配置
   - 确认构建文件存在
   - 查看 Obsidian 控制台错误

2. **数据同步问题**
   - 检查文件权限
   - 确认文件路径配置
   - 验证数据格式

3. **性能优化**
   - 使用数据缓存
   - 优化查询性能
   - 减少不必要的渲染

## 🧪 测试

### 运行测试
```bash
# 运行单元测试
npm run test

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e
```

### 测试覆盖率
```bash
npm run test:coverage
``` 