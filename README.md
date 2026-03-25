# Digital Activity Analyzer (数字足迹分析器)

- 本项目基于google.aistudio创作
- 这是一个基于 React 和 外接 AI 的全方位数字生活分析工具。它可以解析用户的浏览器历史记录、视频观看记录以及各种数字活动日志，并生成深度的可视化报告和 AI 洞察总结。
- 支持自定义API以保证个人隐私,浏览器数据不会上传

## 核心功能

- **多格式支持**：智能解析 Google Takeout (JSON)、Chrome 历史记录 (JSON) 以及 Edge/通用 CSV 格式。
- **数据可视化**：
  - **活跃时间分布**：展示用户在一天中不同时段的活跃程度。
  - **最常访问域名**：通过饼图揭示用户最常流连的网站。
  - **活跃度趋势**：展示过去 30 天的数字活动总量变化。
- **AI 深度洞察**：利用 Google Gemini 3.1 Flash 模型，根据用户的浏览标题和域名频率，生成个性化的数字生活总结。
- **隐私保护**：所有数据均在浏览器本地处理，仅将脱敏后的标题发送给 AI 进行总结。

## 技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite 6
- **样式处理**：Tailwind CSS 4
- **动画效果**：Motion (framer-motion)
- **图表库**：Recharts
- **数据解析**：PapaParse (CSV 解析)
- **AI 集成**：@google/genai (Gemini API)

## 安装环境与运行

### 1. 环境准备

- **Node.js**: 建议使用 v18.0.0 或更高版本。
- **npm**: 建议使用 v9.0.0 或更高版本。
- **浏览器**: 支持现代浏览器的最新版本 (Chrome, Edge, Firefox, Safari)。

### 2. 安装步骤

1.  **克隆或下载项目**: 将项目源代码获取到本地。
2.  **安装依赖**: 在项目根目录下运行以下命令：
    ```bash
    npm install
    ```

### 3. 配置 AI 接口 (可选)

为了启用 AI 深度洞察功能，您需要在项目根目录的 `public/ai-config.json` 文件中配置您的 API 信息。该文件支持 **Google Gemini** 和 **OpenAI** (或兼容接口)。

**示例配置 (`public/ai-config.json`):**
```json
{
  "provider": "gemini",
  "apiKey": "您的_GEMINI_API_KEY",
  "model": "gemini-3.1-flash-lite-preview",
  "enabled": true
}
```
*注：如果您不想使用 AI 功能，可以将 `"enabled"` 设置为 `false`。*

### 4. 开发环境运行

启动本地开发服务器：
```bash
npm run dev
```
启动后，您可以在浏览器中访问 `http://localhost:3000`。

## 打包与部署

### 1. 项目打包

当您准备将应用部署到生产环境时，可以运行以下命令进行打包：
```bash
npm run build
```
该命令会执行以下操作：
- 使用 TypeScript 进行类型检查。
- 使用 Vite 对代码进行压缩和优化。
- 在项目根目录下生成 `dist/` 文件夹。

### 2. 打包产物说明

打包完成后，所有的静态资源（HTML, JS, CSS, 图片等）都会存放在 `dist/` 目录中。
- `dist/index.html`: 应用的入口文件。
- `dist/assets/`: 包含经过混淆和压缩的 JavaScript 和 CSS 文件。
- `dist/ai-config.json`: 您的 AI 配置文件也会被复制到此处，方便在部署后进行修改。

### 3. 部署方法

您可以将 `dist/` 目录中的所有内容上传到任何静态文件托管服务，例如：
- **GitHub Pages**
- **Vercel / Netlify**
- **Nginx / Apache 服务器**

*注意：由于应用依赖于 `ai-config.json` 的动态加载，请确保该文件在部署后的根目录下可被正常访问。*
