# openwrt-zapret2

[English](README.md)

这是基于上游 [zapret2](https://github.com/bol-van/zapret2) NFQUEUE 引擎的非官方
OpenWrt 原生适配，并提供 LuCI 管理界面。构建时下载未经修改的上游 `v1.0.4` 源码并
校验 SHA-256；本仓库只维护 OpenWrt 软件包、配置和控制平面。

## 软件包

- `zapret2` `1.0.4-r8`：提供 `nfqws2`、上游 Lua 策略文件、UCI schema v2、
  ubus API v1、procd 集成和确定性的 nftables 编译器。
- `luci-app-zapret2` `4.0.0-r33`：管理运行设置、有序 Profile、本地列表、
  紧凑的候选配置校验、计数器、受限日志，以及继承 LuCI 主题的操作布局。
- `luci-i18n-zapret2-zh-cn` `4.0.0-r33`：简体中文翻译。

服务默认关闭。默认的 `marked` 接管模式没有包含标记，因此仅安装软件包不会接管流量。

## 作为 OpenWrt feed 使用

在 `feeds.conf.default` 中加入：

```text
src-git zapret2 https://github.com/damocjwj/openwrt-zapret2.git
```

然后更新 feed 并选择软件包：

```sh
./scripts/feeds update zapret2
./scripts/feeds install -p zapret2 zapret2 luci-app-zapret2
make menuconfig
```

分别在 `Network -> Firewall -> zapret2` 和 `LuCI -> Applications ->
luci-app-zapret2` 中选择核心与 LuCI。选择相应语言后，LuCI 构建系统会自动生成翻译包。

本软件包面向 firewall4/nftables 系统，需要内核 NFQUEUE 支持。标准软件或硬件流量卸载
会绕过 NFQUEUE，因此启用时 Zapret2 会拒绝启动，而不会擅自修改防火墙设置。

## 配置模型

流量依次通过两个相互独立的层次：

1. OpenWrt 接管层选择 WAN、转发或路由器本机流量、IP 协议族和数据包标记。排除标记
   始终优先。“全部”模式可以使用，但如果没有外部排除标记，也可能包含代理或 VPN 隧道。
2. `nfqws2` 按顺序检查已启用的 Profile，由第一个匹配项处理。Payload 和范围步骤
   仅影响同一 Profile 中排在其后的动作。

默认配置包含保守的 HTTP、TLS Profile 和一个默认禁用的 QUIC Profile。它们只是示例，
并非适用于所有网络的通用策略；应根据实际网络选择策略。

`queue_mode` 在 Profile 匹配前由 nftables 执行。重叠的 TCP 或 UDP 端口必须采用相同的
队列模式；重叠范围混用 `initial` 和 `keepalive` 会被拒绝。

[Nikki 标记流量示例](examples/nikki-marked-direct.yaml)演示了外部策略引擎如何提供通用
数据包标记。Zapret2 本身不识别 Nikki、Mihomo、`DIRECT` 或其他业务策略名称。

## LuCI 使用流程

四个页面分别管理运行设置、有序 Profile、本地列表和最近日志。编辑 Profile 或步骤时，
修改只存在于浏览器候选配置中，保存前不会写入 UCI。

“配置文件”页面可以在不保存的情况下校验当前修改。紧凑状态行区分未校验、正在校验、
有效、有效但有警告和无效状态。“保存”会先校验再写入 UCI；“保存并应用”会依次校验、
提交并重新加载 Zapret2。三条路径均调用与服务启动相同的编译器。

## 升级与安全说明

- API v1 要求 UCI schema v2。不会自动解释早期实验版配置；升级前请备份并重新配置。
- 应为 `connection_mark`、`generated_mark`、NFQUEUE 编号和外部包含/排除标记保留互不
  冲突的值。
- Zapret2 只管理 `/var/run/zapret2`、经过校验的列表目录和 `inet zapret2` 表；停止
  服务不会改写 firewall4、路由或代理配置。
- 非法重新加载会保留原进程和规则；如果应用状态提交失败，会回滚 nftables 表和运行元数据。

## 诊断

在不启动服务的情况下校验已保存配置：

```sh
/etc/init.d/zapret2 validate
```

查询带版本的 ubus API：

```sh
ubus call zapret2 status '{"api_version":1,"schema_version":2}'
ubus call zapret2 validate '{"api_version":1,"schema_version":2}'
logread -e zapret2
```

常见启动失败原因包括：启用 `marked` 模式但没有包含标记、内部或外部标记重叠、WAN 或
来源网络无法解析、队列被占用、队列模式端口重叠、列表内容无效以及开启流量卸载。

## 开发与验证

```sh
sh zapret2/tests/test-contract.sh

for file in luci-app-zapret2/htdocs/luci-static/resources/zapret2/v4r33/*.js \
            luci-app-zapret2/htdocs/luci-static/resources/view/zapret2/v4r33/*.js; do
    node --check "$file"
done

node luci-app-zapret2/tests/test-ui.js
msgfmt --check --check-format -o /dev/null \
    luci-app-zapret2/po/zh_Hans/zapret2.po
msgcmp luci-app-zapret2/po/zh_Hans/zapret2.po \
    luci-app-zapret2/po/templates/zapret2.pot
```

CI 会重复上述检查，并使用固定 SHA-256 的 OpenWrt 24.10.4 MediaTek/Filogic SDK 构建
三个软件包。`libcap` 仅为编译依赖，最终 `nfqws2` 不链接 `libcap.so`。

维护者可阅读[架构与接口](docs/architecture.zh_CN.md)。`zapret2/tests/` 中的设备测试需要
主动执行，并可能暂时改变 Zapret2 或外部策略引擎的运行状态。

## 有意不提供的功能

本仓库暂不暴露 `zapret2-tools`、blockcheck、远程列表下载、任意脚本、argv、Lua、路径、
Blob 或原始 nftables 输入。

## 许可证

OpenWrt 集成与 LuCI 应用采用 MIT 许可证；下载的上游源码保留其原有版权和许可证。
