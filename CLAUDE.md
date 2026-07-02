# Conflux Assets Dashboard

纯前端 Conflux 资产看板。生产环境使用 Core Space 主网；本地可显式切换 Core Space
测试网验证写交易。Core 地址支持余额、标准 PoS Pool 持仓、池合约预期 APY 和受门禁
保护的交易；eSpace 始终只支持主网原生 CFX 余额。

## 接手入口

1. 遵守 `AGENTS.md`。
2. 从 `docs/TODO.md` 确认本地改动、发布状态和下一任务。
3. 架构与业务细节见 `docs/ARCHITECTURE.md` 和 `docs/PROJECT_CONTEXT.md`。

## 当前状态

- 已完成：Core 查询与聚合、地址/池收藏、池详情、四类受门禁保护的 Core 交易 UI、
  eSpace 原生余额查询。
- 地址总览明确展示可用余额、各质押阶段、收益和包含以上分项的 Core 总资产；池读取失败
  时总资产按已读取下限展示。
- 池详情展示增加质押锁定、可解质押额度、解质押等待和本金可提取的生命周期时间线。
- 首页池列表展示预期 APY 与池总质押，支持按 APY、总质押和收藏顺序排序；地址资产明细
  支持按 APY、有效质押和未领取收益排序；两处排序偏好会按 Core 网络缓存。
- 地址列表保持收藏顺序，以高亮标识当前项，并展示每个地址的总 CFX。
- 界面通过图标按钮切换 `system/light/dark` 主题，颜色均使用语义变量。
- Core/eSpace 路由切换使用稳定滚动条槽位，页面宽度不随内容高度变化。
- 完整验收：58 项单元测试、6 项 Playwright E2E 全部通过。
- 测试网已完成两笔各 1 票的增加质押、回执和状态回读；后续解质押、领取收益和分批
  提取检查点见 `docs/TODO.md`。测试钱包信息未持久化。
- 排序偏好持久化、Core 总资产与质押生命周期时间线已合入 `main` 并发布到生产站点。

## 技术栈

- React 18、TypeScript、Vite、React Router
- TanStack Query、js-conflux-sdk、原生 eSpace JSON-RPC、Fluent Provider API
- Zod、Tailwind CSS、Lucide React、CSS 语义变量
- Vitest、Testing Library、Playwright

## 常用命令

```bash
pnpm dev
pnpm dev:testnet
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
```

生产站点：`https://mosshqq.github.io/conflux-assets/`；`main` 更新会触发 GitHub Pages。
发布后用 `gh run list --workflow deploy-pages.yml --limit 1` 获取运行，再用
`gh run watch <run-id>` 核验。
