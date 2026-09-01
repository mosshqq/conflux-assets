# Conflux Assets Dashboard

Conflux Core Space 与 eSpace 资产看板。生产环境使用主网；用户无需连接钱包即可查询
Core 地址余额和标准 PoS Pool 持仓，连接 Fluent 且网络与地址匹配后可执行完整质押
生命周期。eSpace 地址支持只读原生 CFX、vSwap managed V3 NFT 仓位列表及详情；详情
展示完整价格区间、当前价格、双向报价和预计每日 farming 奖励，不连接钱包或发送交易。

地址总览展示可用余额、质押各阶段、未领取收益、累计收益和总资产；池详情展示该池累计收益，并按实时区块
展示增加质押锁定、可解质押额度、解质押等待和本金可提取进度。

## 在线访问

[https://mosshqq.github.io/conflux-assets/](https://mosshqq.github.io/conflux-assets/)

## 本地开发

要求 Node.js 22+、pnpm 11+。

```bash
pnpm install
pnpm dev
```

本地验证 Core Space 测试网写交易：

```bash
pnpm dev:testnet
```

该模式使用 `https://test.confluxrpc.com`、network ID `1` 和 `cfxtest:` 地址，并与主网
收藏数据隔离。

本地验证 eSpace 测试网只读数据：

```bash
pnpm dev:espace-testnet
```

生产构建始终强制使用 Core Space 主网 network ID `1029` 和 eSpace 主网 chain ID
`1030`。Core 与 eSpace 测试网只能通过各自独立的本地开发命令启用。

## 验收

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
```

## 池收藏

应用不预置 PoS 池。用户在首页手动输入 Core Space 标准 PoS Pool 合约地址，
通过链上 ABI 校验后即可收藏。收藏数据只保存在当前浏览器。

## 文档

- [项目背景](docs/PROJECT_CONTEXT.md)
- [架构](docs/ARCHITECTURE.md)
- [实施状态](docs/TODO.md)
