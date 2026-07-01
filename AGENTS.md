# Repository Instructions

## 接手流程

1. 先读 `CLAUDE.md`、`docs/PROJECT_CONTEXT.md`、`docs/ARCHITECTURE.md`、`docs/TODO.md`。
2. 运行 `git status -sb`，保护用户已有改动；以 `docs/TODO.md` 为任务与发布状态来源。
3. 架构、业务语义、测试基线或发布状态变化时同步更新文档。
4. 页面只组合 hooks/组件；RPC、存储、主题和钱包逻辑不得回流到页面。

## 不变量

- Core Space 只支持主网 network ID 1029；eSpace 只支持主网 chain ID 1030。
- eSpace 当前只读原生 CFX 余额，不扫描池、不连接钱包、不发送交易。
- 链上金额、Drip、票数和收益只能用 `bigint` 或十进制字符串，禁止浮点数。
- 源码禁止预置池；池地址必须由用户输入并通过标准 PoS Pool ABI 校验。
- Core 写交易必须同时满足：Fluent 已连接、网络 1029、账户等于查看地址、池已校验。
- 单池 RPC 异常必须隔离，不能中断 Core 余额或其他池查询。
- 收藏地址按持久化顺序展示；当前项只高亮，未收藏的当前地址追加在末尾。
- 主题颜色必须使用 `src/styles.css` 与 Tailwind 的语义变量，禁止重新写死暗色值。
- 禁止提交私钥、助记词、钱包导出、临时测试账户或真实测试资产信息。

## 完整验收

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
```

按风险可先跑局部测试，但交付前必须跑完整验收。`js-conflux-sdk` 的 direct-eval 和大
chunk 是已知构建警告，不等于构建失败。

## GitHub

- 未经用户明确要求，不提交、不推送、不创建或合并 PR、不部署。
- 创建 PR 时直接创建正式 PR，不创建草稿。
- `gh` token 在沙箱内失效时，先提升权限重试一次，再判断认证失效。
