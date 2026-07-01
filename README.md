# Conflux PoS Dashboard

Conflux Core Space PoS 资产看板。生产环境使用主网；用户无需连接钱包即可查询地址余额和
标准 PoS Pool 持仓，连接 Fluent 且网络与地址匹配后可执行完整质押生命周期。

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
收藏数据隔离。生产构建始终强制使用 Core Space 主网；eSpace 始终使用主网。

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
