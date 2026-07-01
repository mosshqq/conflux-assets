# Project Context

## 项目目标

无需连接钱包即可查询 Conflux 资产：

- Core Space：生产环境查询主网；本地测试网模式查询测试网。支持 CFX 余额、标准 PoS
  Pool 持仓、解质押进度和收益。
- eSpace：暂时只读原生 CFX 余额。
- Core 写操作仅在用户主动连接 Fluent 且全部安全门禁满足时开放。

项目是纯前端 SPA，不托管密钥，不提供投资建议。

## 已完成模块

- 地址：按当前 Core 网络校验并规范化 `cfx:` 或 `cfxtest:` 用户/合约地址，以及 `0x`
  eSpace 地址。
- 查询：Core 余额、多池并发与失败隔离；eSpace `eth_getBalance` 独立查询。
- 聚合：有效质押、解质押中、可提取本金、未领取收益。
- 池 APY：读取标准池 `poolAPY()`，按近 7 天收益年化口径在池卡片和详情页展示。
- 收藏：地址别名、标准池 ABI 校验、本地持久化、带总 CFX 的地址快捷切换。
- 池详情：持仓、治理锁定、解质押队列和局部重试。
- 交易 UI：增加质押、发起解质押、领取收益、提取本金。
- 钱包：Fluent 安装/连接、网络、账户匹配、池校验、解质押锁定票数和动态交易成本
  门禁。
- 主题：通过 Lucide 图标按钮循环切换跟随系统、明亮、暗黑；偏好独立持久化。
- 布局：根元素预留稳定滚动条槽位，Core/eSpace 路由切换不横向抖动。
- 发布：GitHub Pages SPA 回退与自动部署。

## 业务语义

- `1 vote = 1000 CFX`。
- 有效质押：`userSummary.available`。
- 可提取本金：`userSummary.unlocked`。
- 未领取收益：`userInterest(address)`。
- 解质押中：`max(totalVotes - availableVotes - unlockedVotes, 0)`。
- `userSummary.available` 包含仍在 `inQueue` 的票；可发起解质押额度必须使用
  `userSummary.locked`，并扣除 `userLockInfo` 的治理锁定票数。
- 签名前按准备后的交易字段动态校验余额能够覆盖 value、gas 和 Core Space 存储抵押。
- 地址列表总 CFX：Core 为可用余额加所有已收藏池中成功读取的未领取收益；eSpace
  为原生 CFX 可用余额。
- `poolAPY()` 返回基点整数，例如 `756` 展示为 `7.56%`；旧池不支持时 APY 为不可用，
  不影响该池其他持仓字段。

## 当前边界

- eSpace 不支持代币、PoS 池、钱包连接或写交易。
- 不支持 Nucleon、PHX V2 等非标准协议。
- 无后端、登录、数据库、云同步、个性化收益预测或自动交易；池 APY 仅展示合约按近
  7 天收益计算的年化估算。
- 池只能由用户输入并收藏，源码中没有内置池。

## 发布与验证状态

- `main` 通过 GitHub Pages 自动部署到 `https://mosshqq.github.io/conflux-assets/`。
- 当前版本包含 eSpace 余额、收藏顺序、地址总 CFX、图标主题切换和标准池预期 APY。
- 本地完整验收为 46 项单元测试、5 项 Playwright E2E，以及类型、Lint、格式和构建。
- 自动化读取流程以及测试网两笔增加质押、回执、状态回读已验证。SDK 直发已验证链上
  构造，但 Fluent 确认、Query 刷新、解质押、领取收益和分批提取仍需按
  `docs/TODO.md` 完成。
