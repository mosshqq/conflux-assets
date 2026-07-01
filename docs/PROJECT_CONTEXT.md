# Project Context

## 项目目标

无需连接钱包即可查询 Conflux 主网资产：

- Core Space：CFX 余额、标准 PoS Pool 持仓、解质押进度和收益。
- eSpace：暂时只读原生 CFX 余额。
- Core 写操作仅在用户主动连接 Fluent 且全部安全门禁满足时开放。

项目是纯前端 SPA，不托管密钥，不提供投资建议。

## 已完成模块

- 地址：校验并规范化 `cfx:` Core 用户/合约地址与 `0x` eSpace 地址。
- 查询：Core 余额、多池并发与失败隔离；eSpace `eth_getBalance` 独立查询。
- 聚合：有效质押、解质押中、可提取本金、未领取收益。
- 收藏：地址别名、标准池 ABI 校验、本地持久化、带总 CFX 的地址快捷切换。
- 池详情：持仓、治理锁定、解质押队列和局部重试。
- 交易 UI：增加质押、发起解质押、领取收益、提取本金。
- 钱包：Fluent 安装/连接、网络、账户匹配和池校验门禁。
- 主题：通过 Lucide 图标按钮循环切换跟随系统、明亮、暗黑；偏好独立持久化。
- 布局：根元素预留稳定滚动条槽位，Core/eSpace 路由切换不横向抖动。
- 发布：GitHub Pages SPA 回退与自动部署。

## 业务语义

- `1 vote = 1000 CFX`。
- 有效质押：`userSummary.available`。
- 可提取本金：`userSummary.unlocked`。
- 未领取收益：`userInterest(address)`。
- 解质押中：`max(totalVotes - availableVotes - unlockedVotes, 0)`。
- 可发起解质押额度必须扣除 `userLockInfo` 的治理锁定金额。
- 地址列表总 CFX：Core 为可用余额加所有已收藏池中成功读取的未领取收益；eSpace
  为原生 CFX 可用余额。

## 当前边界

- eSpace 不支持代币、PoS 池、钱包连接或写交易。
- 不支持 Nucleon、PHX V2 等非标准协议。
- 无后端、登录、数据库、云同步、收益预测或自动交易。
- 池只能由用户输入并收藏，源码中没有内置池。

## 发布与验证状态

- `main` 通过 GitHub Pages 自动部署到 `https://mosshqq.github.io/conflux-assets/`。
- 当前版本包含 eSpace 余额、收藏顺序、地址总 CFX 和图标主题切换。
- 自动化读取流程已验证；四类 Core 主网写交易尚未使用真实小额钱包验证。
