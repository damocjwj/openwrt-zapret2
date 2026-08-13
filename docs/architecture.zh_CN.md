# 架构与接口

[English](architecture.md) · [项目说明](../README.zh_CN.md)

本仓库将 zapret2 的 Linux `nfqws2` 引擎集成到 OpenWrt，并未派生或修改上游的数据包
处理实现。

## 组件与数据流

```text
LuCI / ubus 客户端
        |
        v
rpcd ucode API（zapret2，API v1）
        |
        +---- 已保存 UCI 或受限的候选 JSON
        v
私有、确定性的编译器
        +---- 规范化诊断与 manifest
        +---- 每行一个 nfqws2 argv
        +---- 完整的 inet zapret2 transaction
        v
procd / nfqws2 / nftables
```

- `/etc/config/zapret2` 是唯一持久策略来源，使用 schema v2。候选 JSON 只临时存在，
  大小受限且采用相同 schema。
- rpcd ucode 对象校验接口版本、限制输入并提供固定方法，不重复实现 Profile 或动作语义。
- 私有编译器读取已保存 UCI 或规范化候选配置，校验整个配置并生成 argv、规则、manifest
  和诊断信息。
- procd 只管理通过校验的 `nfqws2` 进程生命周期。

候选配置校验、计划预览和服务启动均使用同一编译器。只有 `nfqws2 --dry-run` 与
`nft -c` 同时通过，规则才允许应用。

## 公共 API

每个请求都必须提供 `api_version=1` 和 `schema_version=2`；响应会回显两个版本，并返回
`ok=true,data` 或 `ok=false,error`。

只读方法：

- `info`：能力、动作参数和限制；
- `status`：服务状态、应用状态和 nftables 计数器；
- `runtime`：受限的已应用 manifest、argv 和可选规则；
- `validate`：校验已保存 UCI 或完整候选配置；
- `plan`：返回规范化计划但不应用；
- `log`：最多 100 行、32 KiB；
- `list_index`、`list_get`：列表元数据和受限内容。

写入方法：

- `service`：只允许 `start`、`stop`、`reload` 和 `restart`；
- `list_put`、`list_delete`、`list_clear`：经过校验的列表操作。

API 不提交 UCI。LuCI 先校验完整的浏览器候选配置，再通过标准 UCI 变更机制保存；应用
变更后才显式请求重新加载服务。

## 编译器与回滚保证

编译器会校验 schema 字段、ID、Profile/步骤顺序、传输层兼容性、端口、L7/Payload
组合、列表引用、标记、队列、接口和流量卸载状态。限制包括最多 8 个 Profile、每个
Profile 32 个步骤、总计 128 个步骤、32 个流量选择标记，以及每种传输层和队列模式
最多 64 个聚合端口范围。

生成的参数集合以每行一个值表示 argv，不经过 shell 展开，也不接受自由命令。nftables
输出是仅作用于 `inet zapret2` 的完整 transaction。

重新加载会先编译并检查新计划，再接触当前运行状态。非法配置不会替换原进程、argv 或
规则。运行元数据会先暂存；如果 nftables 替换后状态提交失败，编译器会恢复上一份表和
元数据。

## 流量接管

OpenWrt 层只使用通用数据包标记和逻辑网络，不识别代理或业务策略名称。

- 服务启用时，`marked` 模式必须至少设置一个包含标记。
- `all` 模式选择其他条件允许的全部流量，并提示代理或 VPN 隧道也可能被接管。
- 排除标记始终优先于包含标记和 `all` 模式。
- 转发流量和路由器本机流量可以独立选择。
- 选中的连接使用私有单 bit conntrack 标记识别回程流量；生成包使用另一个单 bit 标记
  防止递归，并在 predefrag 阶段设置 `notrack`。

生成规则从已启用 Profile 提取明确的 TCP、UDP、ICMP 和 IP 协议过滤。队列模式在
`nfqws2` 选择 Profile 前执行，因此重叠端口不能混用 `initial` 和 `keepalive`。

Zapret2 检测到标准软件或硬件流量卸载时会拒绝启动，而不会自动修改防火墙。它只创建
和删除 `inet zapret2`。

## Profile、步骤与列表

Profile 按顺序执行，由第一个已启用且匹配的 Profile 处理。Profile 过滤器包括 IP
协议族、明确的传输层端口、ICMP/IP 协议、L7 类型、内联域名/IP 包含和排除项、本地
列表引用及受管理的自动主机列表。同一过滤维度中排除项优先。

步骤保留上游命令顺序语义。Payload、原向范围和回向范围步骤只影响同一 Profile 中
排在其后的动作。`info` 返回能力清单；LuCI 负责渲染，但兼容性和参数范围最终由编译器
判定。

静态域名/IP 列表位于 `/etc/zapret2/lists/`；受管理的自动主机列表使用
`/etc/zapret2/autohostlists/` 下由稳定 Profile ID 派生的路径。系统校验 ID、类型、
条目、大小、权限和引用。静态列表采用同目录临时文件和原子替换；相关内容变化只通知
运行中的引擎，不重建无关服务。

## 安全边界

公共接口不接受任意 Lua、脚本、argv、命令文本、文件系统路径、原始 Blob 或 nftables
输入。远程下载、服务器模式、WinDivert/BSD 平台参数、blockcheck 和 tools 不在软件包
范围内。

Zapret2 只拥有自身 UCI 配置、列表目录、`/var/run/zapret2`、受限日志访问和
`inet zapret2`。停止或重新加载失败不会修改 firewall4、路由、代理或其他 nftables 表。
