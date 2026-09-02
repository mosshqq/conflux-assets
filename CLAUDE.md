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

- Core：余额、标准 PoS 多池持仓/生命周期/APY/排序、地址与池收藏、总资产和累计收益聚合，
  以及基于全部有效质押和对应池 APY 的预计每日收益；增加质押、解质押、单池领取收益、
  提取本金及先逐笔确认、再统一等待回执的一键领取五类受门禁保护的交易 UI；一键领取可按当前 Core 网络
  配置最低收益门槛。钱包网络不匹配时可请求 Fluent 切网，生命周期默认收起，质押/解质押
  支持安全 MAX。
- eSpace：原生 CFX 余额和 vSwap managed V3 NFT 仓位；列表展示 token 数量、区间状态、
  未领取手续费与 farming 奖励，详情页展示完整 Tick/价格区间、当前价格、双向报价及基于
  活动 incentive 的预计每日奖励；全部只读。
- 通用：地址快捷切换与总 CFX、本地数据导入导出、POS 池专用配置导入导出、语义颜色主题、
  稳定滚动条槽位、GitHub Pages 部署。
- 当前发布状态、验收基线和后续任务以
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
