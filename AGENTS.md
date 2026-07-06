# Repository Instructions

## 接手流程

1. 先读 `CLAUDE.md`、`docs/PROJECT_CONTEXT.md`、`docs/ARCHITECTURE.md`、`docs/TODO.md`。
2. 运行 `git status -sb`，保护用户已有改动；以 `docs/TODO.md` 为任务与发布状态来源。
3. 架构、业务语义、测试基线或发布状态变化时同步更新文档。
4. 页面只组合 hooks/组件；RPC、存储、主题和钱包逻辑不得回流到页面。

## 不变量

- 生产构建的 Core Space 只支持主网 network ID 1029；本地 `pnpm dev:testnet` 使用测试网
  network ID 1。生产构建的 eSpace 只支持主网 chain ID 1030；本地
  `pnpm dev:espace-testnet` 使用测试网 chain ID 71；两个本地测试网模式彼此独立。
- eSpace 只读原生 CFX 余额和 vSwap 管理的 V3 NFT 仓位，不连接钱包、不发送交易；
  vSwap 多 token 资产不得折算进地址列表总 CFX。
- 链上金额、Drip、票数和收益只能用 `bigint` 或十进制字符串，禁止浮点数。
- 源码禁止预置池；池地址必须由用户输入并通过标准 PoS Pool ABI 校验。
- Core 写交易必须同时满足：Fluent 已连接、钱包网络等于当前 Core 配置、账户等于查看
  地址、池已校验；已连接但网络不匹配时只能通过 `wallet_switchConfluxChain` 请求切换，
  不得绕过门禁。
- 质押 MAX 必须使用余额扣除 1 CFX 基础费用后可容纳的最大整票金额；解质押 MAX 必须
  使用治理锁定扣除后的可解质押票数。两者都只能用 `bigint` 计算。
- 可发起解质押票数只能使用 `userSummary.locked` 扣除治理锁定票数，禁止使用包含
  `inQueue` 的 `available`。
- 交易签名前必须按准备后的字段校验余额可覆盖
  `value + gas * gasPrice + storageLimit * 1 CFX / 1024`。
- SDK/RPC 直发只能验证链上行为；涉及 Fluent 确认、页面状态和 Query 刷新的任务，必须
  使用本地测试网 UI 完成后才能标记为端到端验证通过。
- 单池 RPC 异常必须隔离，不能中断 Core 余额或其他池查询。
- 单个 vSwap 仓位或可选手续费/奖励读取失败必须隔离，不能中断 eSpace 原生余额或其他
  仓位；整仓位失败或成功仓位带 warning 时，汇总必须以 `≥` 标识已读取下限。
- 池预期 APY 只能读取标准池 `poolAPY()` 并按基点展示；旧池不支持时显示不可用，不得
  让 APY 失败中断该池持仓查询，也不得改用前端浮点估算。
- 首页池总质押只能读取 `poolSummary().available` 票数并按 `1 票 = 1000 CFX` 换算。
- 池排序默认保持持久化收藏顺序；数值排序必须使用 `bigint`，不可用值置后，同值保持
  收藏顺序。地址明细的质押排序使用 `activeVotes`；首页和地址明细排序偏好按 Core
  网络持久化，旧版 v1 缓存缺失字段时必须回退为收藏顺序。
- 收藏地址按持久化顺序展示；当前项只高亮，未收藏的当前地址追加在末尾。
- 地址列表总 CFX：Core 只能计算“可用余额 + 成功读取池的未领取收益”，eSpace
  只能计算原生可用余额；查询必须复用现有 TanStack Query key。
- 地址总览 Core 总资产只能计算“可用余额 + 成功读取池的有效质押、解质押中、可提取
  本金、未领取收益”；首次查询未完成时不展示总值，池读取失败时必须以 `≥` 标识下限。
- 质押生命周期必须读取标准池 `userInQueue()`、`userOutQueue()` 和当前区块；剩余时间
  只能作为约 2 区块/秒的提示，状态判断必须使用目标区块与链上字段；增加质押锁定只
  展示 `lockBlock > currentBlock` 的未完成节点；详情默认收起但当前区块必须保持可见。
- 主题切换保持 `system -> light -> dark` 图标循环；图标使用 `lucide-react`，不得恢复为
  选择器。
- 主题颜色必须使用 `src/styles.css` 与 Tailwind 的语义变量，禁止重新写死暗色值。
- 根元素必须保留稳定滚动条槽位，Core/eSpace 页面高度变化不能造成横向抖动。
- 禁止提交私钥、助记词、钱包导出、临时测试账户或真实测试资产信息。
- 接续测试时由用户重新提供或连接专用测试钱包；文档只记录无敏感信息的区块检查点。

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
