# Architecture

## 系统形态

纯前端 SPA，无后端：

```text
Pages
  -> feature components / hooks
    -> domain rules
      -> Core RPC + standard PoS Pool contracts
      -> eSpace JSON-RPC (balance only)
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
  config/                 Core/eSpace 主网配置、标准池 ABI
  domain/                 地址、金额、聚合、交易规则与类型
  features/dashboard/     Core 聚合、eSpace 余额、地址切换与列表总额
  features/pools/         池集合、校验、管理与卡片
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

- `normalizeQueryAddress` 区分 Core/eSpace。
- Core 经过 `usePortfolio`，每个池使用独立 Query；失败结果不进入聚合。
- eSpace 经过 `useESpaceBalance`，只调用 `eth_getBalance`。
- 两类 Query 互斥启用，切换路由不能触发错误网络的请求。

### 地址列表

- `bookmarks` 的数组顺序就是展示顺序。
- 当前收藏地址仅高亮，不重新排序。
- 未收藏的当前地址追加到列表末尾；桌面为左侧栏，窄屏为横向列表。
- 每个地址的总 CFX 由 `features/dashboard/useAddressTotal` 查询：Core 为可用余额加所有
  已收藏池中成功读取的未领取收益，eSpace 仅为原生可用余额。
- 地址总额查询复用当前详情的 TanStack Query key；单池失败只标记部分读取失败，不影响
  Core 余额和其他池收益。

### 写交易

```text
表单校验
  -> Fluent/1029/账户匹配/池校验门禁
  -> gas 与 storage 估算
  -> 用户确认与签名
  -> 回执轮询
  -> Query 失效刷新
```

页面与组件不得绕过 `features/wallet` 和 `infrastructure/conflux`。

### 持久化与主题

- `conflux-pos-dashboard:v1` 只保存 `bookmarks`、`customPools`；链上数据不落盘。
- 主题使用独立 key `conflux-assets:theme`，值为 `system | light | dark`。
- 主题控件使用 Lucide 图标按钮按 `system -> light -> dark` 循环切换。
- 颜色定义在 `src/styles.css` 的 CSS 变量，Tailwind 只引用语义颜色。
- `system` 模式监听系统主题；显式明亮/暗黑不跟随系统变化。

## 关键决策

- Core：network ID 1029，`https://main.confluxrpc.com`。
- eSpace：chain ID 1030，`https://evm.confluxrpc.com`。
- 链上金额全部使用 `bigint`；展示层只格式化字符串。
- 标准池必须由用户输入并在保存前通过 ABI 读取校验。
- 钱包直接使用 Fluent 注入 Provider，避免未安装扩展时产生未处理异常。
- 写交易必须满足 Fluent 已连接、1029、账户匹配、池已校验。

## 构建与部署

- Vite 基路径为 `/conflux-assets/`，React Router 使用同一 basename。
- 构建生成 `404.html` 作为 GitHub Pages SPA 回退。
- `.github/workflows/deploy-pages.yml` 在 `main` 更新时构建并部署。
- 发布后必须确认 `deploy-pages.yml` 成功，再检查生产站点可访问。
- `js-conflux-sdk` UMD 的 direct-eval 和大 chunk 为已知警告。
