# Conflux Assets Dashboard

纯前端 Conflux 主网资产看板。Core Space 地址支持余额、标准 PoS Pool 持仓和受门禁保护
的交易；eSpace 地址暂时只支持原生 CFX 余额。

## 接手入口

1. 遵守 `AGENTS.md`。
2. 从 `docs/TODO.md` 确认本地改动、发布状态和下一任务。
3. 架构与业务细节见 `docs/ARCHITECTURE.md` 和 `docs/PROJECT_CONTEXT.md`。

## 当前状态

- 已完成：Core 查询与聚合、地址/池收藏、池详情、四类 Core 交易 UI、eSpace 余额查询。
- 地址列表保持收藏顺序；界面支持 `system/light/dark` 主题及语义颜色。
- 完整验收：33 项单元测试、4 项 Playwright E2E 全部通过。
- 尚未完成：使用专用小额钱包真实验证四类 Core 主网写交易。

## 技术栈

- React 18、TypeScript、Vite、React Router
- TanStack Query、js-conflux-sdk、原生 eSpace JSON-RPC、Fluent Provider API
- Zod、Tailwind CSS、CSS 语义变量
- Vitest、Testing Library、Playwright

## 常用命令

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
```

生产站点：`https://mosshqq.github.io/conflux-assets/`；`main` 更新会触发 GitHub Pages。
