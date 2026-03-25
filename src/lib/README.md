# Library Directory (库与工具函数目录)

本目录用于存放通用的工具函数和第三方库的封装。

## 文件说明

- **utils.ts**:
  - 包含 `cn` 工具函数。
  - **功能**：结合了 `clsx` 和 `tailwind-merge`。
  - **用途**：用于动态合并 Tailwind CSS 类名，解决类名冲突问题，使组件代码更加简洁和可维护。

## 使用示例

```typescript
import { cn } from './lib/utils';

const MyComponent = ({ className, isActive }) => (
  <div className={cn(
    "base-styles p-4 rounded-lg", 
    isActive ? "bg-blue-500" : "bg-gray-200",
    className
  )}>
    Content
  </div>
);
```
