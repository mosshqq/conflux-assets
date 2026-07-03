# Conflux Assets Dashboard

纯前端 Conflux 资产看板。生产环境使用 Core Space 主网；本地可显式切换 Core Space
测试网验证写交易。Core 地址支持余额、标准 PoS Pool 持仓、池合约预期 APY 和受门禁
保护的交易；生产环境 eSpace 主网支持原生 CFX 余额及只读 vSwap LP Farming 仓位，
本地可显式切换 eSpace 测试网验证读取。

## 接手入口

1. 遵守 `AGENTS.md`。
2. 从 `docs/TODO.md` 确认本地改动、发布状态和下一任务。
3. 架构与业务细节见 `docs/ARCHITECTURE.md` 和 `docs/PROJECT_CONTEXT.md`。

## 当前状态

- Core：余额、标准 PoS 多池持仓/生命周期/APY/排序、地址与池收藏、总资产聚合，以及
  增加质押、解质押、领取收益、提取本金四类受门禁保护的交易 UI。
- eSpace：原生 CFX 余额和 vSwap managed V3 NFT 仓位，展示 token 数量、区间状态、
  未领取手续费与 farming 奖励；全部只读。
- 通用：地址快捷切换与总 CFX、语义颜色主题、稳定滚动条槽位、GitHub Pages 部署。
- vSwap 与 eSpace 测试网改动位于 PR #1，尚未合入 `main`；发布和后续任务以
  `docs/TODO.md` 为准。

## 技术栈

- React 18、TypeScript、Vite、React Router
- TanStack Query、js-conflux-sdk、viem、eSpace JSON-RPC、Fluent Provider API
- Zod、Tailwind CSS、Lucide React、CSS 语义变量
- Vitest、Testing Library、Playwright

## 常用命令

```bash
pnpm dev
pnpm dev:testnet
pnpm dev:espace-testnet
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
```

生产站点：`https://mosshqq.github.io/conflux-assets/`。`main` 更新触发 GitHub Pages；
发布后检查 `deploy-pages.yml` 并核验生产页面。
