# Project Context

## 项目目标

无需连接钱包即可查询 Conflux 资产：

- Core Space：生产环境查询主网；本地测试网模式查询测试网。支持 CFX 余额、标准 PoS
  Pool 持仓、解质押进度和收益。
- eSpace：生产环境读取主网，本地可显式切换测试网；只读原生 CFX 余额和 vSwap LP
  Farming 仓位，不连接钱包或发送交易。
- Core 写操作仅在用户主动连接 Fluent 且全部安全门禁满足时开放。

项目是纯前端 SPA，不托管密钥，不提供投资建议。

## 技术栈

- React 18、TypeScript、Vite、React Router、Tailwind CSS。
- TanStack Query 管理链上缓存；Core 使用 `js-conflux-sdk`，eSpace/vSwap 使用 viem。
- Zod 做持久化校验；Vitest、Testing Library、Playwright 负责验收。

## 已完成模块

- 地址：按当前 Core 网络校验并规范化 `cfx:` 或 `cfxtest:` 用户/合约地址，以及 `0x`
  eSpace 地址。
- 查询：Core 余额、多池并发与失败隔离；eSpace `eth_getBalance` 独立查询，并通过
  vSwap staker subgraph 发现地址仓位、通过 eSpace 合约读取仓位资产、手续费和奖励。
- vSwap：分页发现 managed NFT；逐仓位读取 Position Manager、池状态、token 元数据、
  仓位资产、未领取手续费与 farming 奖励；支持单仓位重试和部分结果下限。独立详情路由
  只允许读取 staker subgraph 为当前地址发现的 managed NFT，并与列表复用包含 eSpace
  chain ID、地址和 token ID 的 TanStack Query key。
- vSwap 详情：展示完整 Tick 区间、基于池 `slot0.sqrtPriceX96` 的当前价格、双向报价切换、
  仓位资产、手续费、奖励，以及按活动 incentive 仓位级奖励速率换算的预计每日奖励。
- 聚合：有效质押、解质押中、可提取本金、未领取收益、累计收益，以及可用余额加池内本金
  和收益的 Core 总资产；存在未读取池时按下限展示。
- Core 预计每日收益：逐池使用有效质押和链上 `poolAPY()` 基点值计算一天预计收益后
  汇总；数据或有效持仓池 APY 不完整时不展示部分估算。
- Core 复投提示：按可用余额、待领取的未领取收益、所有有效质押和各池链上 APY 估算
  下一次可凑足一票的时间；目标包含 1000 CFX 一票和 1 CFX 基础费用预留，数据或 APY
  不完整时不作估算。
- 池 APY：读取标准池 `poolAPY()`，按近 7 天收益年化口径在池卡片和详情页展示。
- 池概览：首页读取 `poolSummary().available` 展示池总质押，并支持 APY、总质押、收藏
  顺序排序；地址明细支持 APY、有效质押、未领取收益排序；两处排序偏好按 Core 网络
  本地持久化。
- 收藏：地址别名、标准池 ABI 校验、本地持久化、带总 CFX 的地址快捷切换。
- 本地数据：收藏地址、收藏池和排序偏好支持按当前 Core 网络导出 JSON，并在同网络内
  校验导入、合并恢复。
- 池详情：持仓、治理锁定、增加质押 `inQueue`、解质押 `outQueue`、可解质押额度和
  本金可提取状态组成的可展开生命周期时间线，以及局部重试；生命周期默认收起，增加
  质押锁定只展示 `lockBlock > currentBlock` 的未完成节点。
- 交易 UI：增加质押、发起解质押、单池领取收益、提取本金和一键领取；一键领取按最低
  收益门槛筛选成功读取的池，逐笔请求 Fluent 确认并提交，全部已提交交易再统一等待链上
  回执。质押展示当前余额并支持预留基础费用后的整票 MAX，解质押支持按可用票数填入 MAX。
- 钱包：Fluent 安装/连接、Core 主网/测试网切换、网络与账户匹配、池校验、解质押锁定
  票数和动态交易成本门禁。
- 主题：通过 Lucide 图标按钮循环切换跟随系统、明亮、暗黑；偏好独立持久化。
- 布局：根元素预留稳定滚动条槽位，Core/eSpace 路由切换不横向抖动。
- 发布：GitHub Pages SPA 回退与自动部署。

## 业务语义

- `1 vote = 1000 CFX`。
- 有效质押：`userSummary.available`。
- 可提取本金：`userSummary.unlocked`。
- 未领取收益：`userInterest(address)`。
- 累计收益：对每个成功读取的已记录池，使用 `userSummary.claimedInterest` 加上实时
  `userInterest(address)`，再汇总为该地址的累计收益；池读取不完整时只展示已读取池的下限。
- 解质押中：`max(totalVotes - availableVotes - unlockedVotes, 0)`。
- `userSummary.available` 包含仍在 `inQueue` 的票；可发起解质押额度必须使用
  `userSummary.locked`，并扣除 `userLockInfo` 的治理锁定票数。
- 质押 MAX 先从钱包余额扣除 1 CFX 基础费用，再向下取整为 1000 CFX 的整数倍；最终
  仍必须使用准备后的交易字段做动态费用校验。解质押 MAX 使用上述可发起解质押额度。
- 签名前按准备后的交易字段动态校验余额能够覆盖 value、gas 和 Core Space 存储抵押。
- 地址列表总 CFX：Core 为可用余额加所有已收藏池中成功读取的未领取收益；eSpace
  为原生 CFX 可用余额。
- vSwap 仓位资产按 token 地址分别聚合，不进行美元或 CFX 折算；整仓位失败或可选
  手续费/奖励读取 warning 都使汇总以 `≥` 标识下限。
- vSwap 人类可读的 `token1 / token0` 价格按
  `sqrtPriceX96² × 10^token0Decimals / (2^192 × 10^token1Decimals)` 计算；反向报价取
  倒数并交换区间上下端点。计算和舍入使用 `bigint` 有理数与十进制字符串，不使用浮点
  金额。
- incentive 在 `startTime <= blockTimestamp < endTime` 时视为活动；同一奖励代币的活动
  `rewardsPerSecondX32` 先汇总，再按 `floor(Σ(rate) × 86400 / 2^32)` 换算每日预计奖励。
  非 `in-range` 仓位按 0 展示；区块时间不可用时显示不可用。该值是当前链上速率快照，
  不保证未来奖励。
- vSwap 详情继续继承 warning/下限语义；可选手续费或奖励读取不完整时，成功读取金额和
  预计值以 `≥` 标识。
- 地址总览 Core 总资产：可用余额加成功读取池的有效质押、解质押中、可提取本金和
  未领取收益；未完成的池查询不展示总值，池读取失败时以 `≥` 标识已读取资产下限。
- 地址总览 Core 累计收益：汇总每个成功读取池的已领取收益与当前未领取收益；首次读取未完成
  时不展示部分值，池读取失败时以 `≥` 标识已读取池的累计收益下限。
- `poolAPY()` 返回基点整数，例如 `756` 展示为 `7.56%`；旧池不支持时 APY 为不可用，
  不影响该池其他持仓字段。
- 池总质押使用 `poolSummary().available` 返回的票数，按 `1 票 = 1000 CFX` 展示；不使用
  浮点数换算。
- “预计下次可质押时间”仅将 `activeVotes` 计入本金，并以各池 `poolAPY()` 的基点值加权
  推算未领取收益增长；这是基于近 7 天年化快照的匀速估算，不保证未来收益或到账时间。
- “预计每日收益”按
  `Σ(activeVotes × 1000 CFX × poolAPY 基点) ÷ 10000 ÷ 365`
  计算；只使用有效质押，不计入解质押中或可提取本金，同样不保证实际收益或到账时间。
- 池排序默认保持收藏顺序；数值排序时读取失败或 APY 不可用的池置于可比较项之后，同值
  继续保持收藏顺序。地址明细的质押排序使用 `activeVotes`（有效质押）。

## 当前边界

- eSpace 不支持通用代币余额、PoS 池、钱包连接或写交易；只额外读取 vSwap 管理的 V3
  NFT 仓位。
- 不接入旧 vSwap VST/veVST 锁仓；仓库中的旧主网 VotingEscrow 地址链上已无合约代码。
- vSwap 仓位详情和每日奖励均为只读链上快照；不提供钱包操作、领取交易、美元/CFX
  折算或未来收益保证。
- eSpace 测试网仅由本地 `pnpm dev:espace-testnet` 启用，生产构建即使使用同名 mode
  也必须回退主网。
- 不支持 Nucleon、PHX V2 等非标准协议。
- 无后端、登录、数据库、云同步、个性化收益预测或自动交易；池 APY 仅展示合约按近
  7 天收益计算的年化估算。
- 池只能由用户输入并收藏，源码中没有内置池。
- 本地导入导出不做云同步，不保存链上查询结果；测试网与主网备份不能互导。
- 一键领取最低收益门槛仅保存在当前 Core 网络的本地浏览器，不包含在导入导出文件中。

## 发布与验证状态

- `main` 通过 GitHub Pages 自动部署到 `https://mosshqq.github.io/conflux-assets/`。
- vSwap/eSpace 测试网功能已随 PR #1、接手文档已随 PR #2 合入并于 2026-07-03 部署；
  真实主/测试网只读数据已验证。
- 钱包切网、生命周期折叠和 MAX 表单已随 PR #3 于 2026-07-06 部署；对应版本通过
  76 项单测、6 项 E2E、类型、Lint、格式和生产构建，生产资源已核验包含新控件。
- 本地数据导入导出已于 2026-07-09 完成，本地完整验收通过 80 项单测、6 项 E2E、
  类型、Lint、格式和生产构建。
- Core 测试网真实 Fluent 闭环已完成：已验证网络不匹配时的切网拒绝与成功、两笔独立
  解质押、两条 `outQueue`、本金解锁后的提取、交易回执和 Query 刷新。全流程完成后通过
  91 项单测、6 项 E2E、类型、Lint、格式和生产构建。
- vSwap 仓位详情与一键领取提交优化已随 PR #6 于 2026-08-28 合入 `main` 并部署；已使用
  真实 eSpace 主网和测试网 managed NFT 样本核验详情读取、双向价格、活动 incentive 每日
  奖励与 375px 布局，并通过 114 项单测、8 项 E2E、类型、Lint、格式和生产构建。生产入口
  与 SPA fallback 已核验，线上资源包含详情路由和新的领取提交流程。
