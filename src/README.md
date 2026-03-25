# Source Directory (源代码目录)

本目录包含了应用程序的核心逻辑和 UI 组件。

## 关键文件说明

- **App.tsx**: 
  - 应用程序的主入口组件。
  - 包含文件上传处理逻辑（支持 JSON 和 CSV）。
  - 包含数据归一化逻辑，能够识别多种不同格式的时间戳和标题字段。
  - **AI 配置加载**: 在组件挂载时从 `public/ai-config.json` 动态获取 AI 接口设置。
  - **AI 分析逻辑**: 根据配置调用 Gemini 或 OpenAI API 生成用户画像。
  - 包含基于 Recharts 的可视化仪表盘。

- **main.tsx**: 
  - React 应用程序的挂载点，负责渲染 `App` 组件到 DOM 中。

- **index.css**: 
  - 全局样式文件，集成了 Tailwind CSS。

- **types.ts**: 
  - 定义了全应用通用的 TypeScript 接口，如 `ActivityItem` (单条活动记录) 和 `ActivitySummary` (分析总结数据结构)。

## 数据流向

1. **用户上传** -> `App.tsx` 中的 `processFile` 函数。
2. **解析与归一化** -> 将不同来源的数据转换为统一的 `ActivityItem` 数组。
3. **统计计算** -> 计算时间分布、域名频率和每日趋势。
4. **AI 请求** -> 将部分标题样本发送至 Gemini 模型。
5. **UI 渲染** -> 使用 Recharts 绘制图表，并展示 AI 生成的总结。
