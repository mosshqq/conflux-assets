# Architecture

## 系统形态

纯前端 SPA，无后端：

```text
Pages
  -> feature components / hooks
    -> domain rules
      -> Core RPC + standard PoS Pool contracts
      -> eSpace JSON-RPC + vSwap staker subgraph (read only)
      -> Fluent injected provider (Core writes only)
  -> versioned localStorage
  -> theme preference localStorage
```

页面不得直接访问 RPC、`window.conflux`、localStorage 或自行构造交易。
根元素使用稳定滚动条槽位，禁止因页面高度差异造成路由切换时的横向位移。

## 目录职责

```text
src/
  app/                    Provider、路由、业务状态上下文
  components/             无链上副作用的通用 UI
  config/                 Core/eSpace 网络、标准 PoS 池和 vSwap 精简 ABI
  domain/                 地址、金额、聚合、交易规则与类型
  features/dashboard/     Core 聚合、eSpace 余额/vSwap 仓位、地址切换与列表总额
  features/pools/         池集合、概览 Query、校验、排序、生命周期、管理与卡片
  features/settings/      本地数据导入导出 UI
  features/theme/         主题解析、Provider、切换控件
  features/wallet/        Fluent Provider、门禁、交易 UI
  infrastructure/conflux/ Core/eSpace RPC、合约读取、交易构造
  infrastructure/storage/ 业务 localStorage schema 与恢复
  pages/                  首页、地址总览、池详情
e2e/
  smoke.spec.ts           关键本地流程、主题持久化与布局稳定性
```

## 数据流与边界

### 地址查询

- `normalizeQueryAddress` 区分 Core/eSpace，并只接受当前 Core 网络对应的地址前缀。
- Core 经过 `usePortfolio`，每个池使用独立 Query；失败结果不进入聚合。
- 地址总览总资产由 domain 聚合规则计算：Core 可用余额加成功读取池的有效质押、
  解质押中、可提取本金和未领取收益；有池尚在首次读取时暂不显示总值，有池读取失败时
  使用 `≥` 展示已读取下限并明确提示缺失数量。
- 池持仓查询同时读取 `poolAPY()`，按基点精确展示合约近 7 天年化估算；旧池不支持该
  方法时仅隐藏 APY，不影响持仓读取。
- 池持仓同时读取标准 `userInQueue()` 和 `userOutQueue()`；池详情按当前区块展示增加
  质押锁定、可解质押额度、解质押等待和本金提取四阶段时间线。时间按约 2 区块/秒估算，
  只作提示，状态判断始终使用目标区块和链上字段；`inQueue` 中目标区块已到达但尚未被
  合约清理的节点不再作为“锁定中”展示。
- eSpace 原生余额经过 `useESpaceBalance`，只调用 `eth_getBalance`。
- vSwap 经过 `useVSwapPositions`：先由 staker subgraph 分页发现 `isManaged: true` 的 NFT，
  再为每个仓位建立独立 Query，使用 viem 读取 Position Manager、池、ERC-20 元数据和
  Staker。单仓位失败不能中断原生余额或其他仓位。
- 仓位 token 数量使用 Uniswap V3 TickMath/Q96 bigint 公式计算；手续费通过只读模拟
  `AutoPositionManager.collect` 获取，farming 奖励按 reward token 合并。多 token 汇总
  不折算成美元或 CFX；整仓位失败或可选字段 warning 都使汇总以已读取下限展示。
- 两类 Query 互斥启用，切换路由不能触发错误网络的请求。

### 地址列表

- `bookmarks` 的数组顺序就是展示顺序。
- 当前收藏地址仅高亮，不重新排序。
- 未收藏的当前地址追加到列表末尾；桌面为左侧栏，窄屏为横向列表。
- 每个地址的总 CFX 由 `features/dashboard/useAddressTotal` 查询：Core 为可用余额加所有
  已收藏池中成功读取的未领取收益，eSpace 仅为原生可用余额。
- 地址总额查询复用当前详情的 TanStack Query key；单池失败只标记部分读取失败，不影响
  Core 余额和其他池收益。
- 地址列表的 eSpace 总 CFX 仍只使用原生余额，不包含 vSwap 仓位 token 或奖励。

### 池概览与排序

- 首页 `usePoolOverviews` 为每个收藏池建立独立 `['pool-overview', pool.address]` Query，
  读取 `poolSummary().available` 和 `poolAPY()`；单池失败不影响其他池。
- `poolSorting.ts` 集中实现首页与地址明细排序；页面和展示组件只传入排序选项。
- 首页可按 APY、池总质押、收藏顺序排序；地址明细可按 APY、`activeVotes`、未领取收益
  和收藏顺序排序。比较使用 `bigint`，缺失值置后，同值保持原顺序。

### 写交易

```text
表单校验
  -> 整票输入（质押 MAX 预留 1 CFX；解质押 MAX 扣除治理锁定）
  -> Fluent/当前 Core network ID（不匹配时请求 wallet_switchConfluxChain）/账户/池门禁
  -> gas 与 storage 估算
  -> value + gas + storage 最大占用余额校验
  -> 用户确认与签名
  -> 回执轮询
  -> Query 失效刷新
```

页面与组件不得绕过 `features/wallet` 和 `infrastructure/conflux`。
SDK/RPC 脚本可用于诊断链上行为，但不能替代 Fluent 注入、确认弹窗、回执状态和 Query
失效刷新的 UI 端到端验证。

### 持久化与主题

- 主网使用 `conflux-pos-dashboard:v1`，本地 Core 测试网使用
  `conflux-pos-dashboard:core-testnet:v1`；两者都只保存 `bookmarks`、`customPools`、首页
  与地址明细的池排序偏好，链上数据不落盘。
- 本地数据导出文件只包含当前 Core 网络范围的上述持久化状态，并写入 `coreNetworkId`；
  导入时必须匹配当前 Core 网络，格式通过 `infrastructure/storage/localState.ts` 校验后再
  与现有收藏合并，重复地址或池以导入文件为准。
- 主题使用独立 key `conflux-assets:theme`，值为 `system | light | dark`。
- 主题控件使用 Lucide 图标按钮按 `system -> light -> dark` 循环切换。
- 颜色定义在 `src/styles.css` 的 CSS 变量，Tailwind 只引用语义颜色。
- `system` 模式监听系统主题；显式明亮/暗黑不跟随系统变化。

## 关键决策

- Core 生产环境：network ID 1029，`https://main.confluxrpc.com`。
- Core 本地测试网模式：network ID 1，`https://test.confluxrpc.com`；仅
  `pnpm dev:testnet` 生效，生产构建即使使用同名 Vite mode 也强制回退主网。
- eSpace 生产环境：chain ID 1030，`https://evm.confluxrpc.com`。
- eSpace 本地测试网模式：chain ID 71，`https://evmtestnet.confluxrpc.com`；仅
  `pnpm dev:espace-testnet` 生效，生产构建即使使用同名 Vite mode 也强制回退主网。
- vSwap 合约地址、浏览器和只读 staker subgraph 跟随当前 eSpace 网络；不连接钱包、
  不发送交易。
- eSpace 原生余额和 vSwap Query key 包含 chain ID，避免主网与测试网缓存混用。
- 链上金额全部使用 `bigint`；展示层只格式化字符串。
- `poolAPY()` 原始整数按基点保存在 `PoolPosition.expectedApyBps`；读取失败使用 `null`
  降级，禁止前端根据累计收益或浮点数自行推算。
- 标准池必须由用户输入并在保存前通过 ABI 读取校验。
- 钱包直接使用 Fluent 注入 Provider，避免未安装扩展时产生未处理异常。
- 写交易必须满足 Fluent 已连接、钱包 network ID 等于当前 Core 配置、账户匹配、池已
  校验；切网只由 `useCoreWallet` 封装 `wallet_switchConfluxChain`，页面不得访问 provider。
- 质押 MAX 按 `(balance - 1 CFX) / 1000 CFX` 向下取整为票数，解质押 MAX 复用
  `maxUnstakeVotes`；MAX 只是表单填充，不能替代准备交易后的动态费用校验。
- 可解质押票数使用 `userSummary.locked` 扣除治理锁定票数；`available` 包含
  `inQueue`，不能作为可解质押额度。
- 准备交易后按 `value + gas * gasPrice + storageLimit * 10^18 / 1024` 校验余额，全部
  使用 `bigint`。
- 单元测试覆盖网络选择/切换、钱包表单 MAX、生命周期折叠、池查询/排序、`inQueue`
  解质押门禁、动态交易成本和本地数据导入导出；Playwright 覆盖读取范围、池排序控件、
  主题、地址切换与布局。vSwap 单元测试覆盖 TickMath、subgraph 分页、逐仓位失败隔离、
  token 聚合和 warning-only 下限。真实钱包写流程另按 `docs/TODO.md` 验证。

## 构建与部署

- Vite 基路径为 `/conflux-assets/`，React Router 使用同一 basename。
- 构建生成 `404.html` 作为 GitHub Pages SPA 回退。
- `.github/workflows/deploy-pages.yml` 在 `main` 更新时构建并部署。
- 发布后必须确认 `deploy-pages.yml` 成功，再检查生产站点可访问。
- `js-conflux-sdk` UMD 的 direct-eval 和大 chunk 为已知警告。
