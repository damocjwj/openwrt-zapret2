# luci-app-zapret2

[English](README.md) · [项目说明](../README.zh_CN.md)

这是 `zapret2` 核心软件包所提供 OpenWrt 控制平面的原生 LuCI 客户端。Version 4 直接
使用 ubus 对象 `zapret2`、API v1 和 UCI schema v2，不额外安装 rpcd 实现。

浏览器模块使用 `zapret2/v4r31/` 命名空间。仅升级 IPK、但固件全局资源版本未变化时，
该命名空间可以防止浏览器继续复用旧 RPC、策略或页面模块。

## 页面

- **Zapret2**：服务状态、计数器、服务操作、WAN/来源网络、标记接管、队列限制和高级
  运行设置。
- **配置文件**：有序 Profile 概览和单个当前工作区，包含过滤器与完整的有序步骤表。
  可用动作和参数由后端 `info` 能力清单决定。
- **本地列表**：经过校验的域名/IP 列表管理，以及只读的受管理自动主机列表。
- **日志**：受限、只读的系统日志，支持手动刷新、轮询和滚动到底部。

## 候选配置校验

未保存的表单状态会编码为
`{api_version,schema_version,sections[].{name,type,options,lists}}`，然后传给核心
`validate` 方法。紧凑校验表显示：

- 未校验（`notice`）；
- 正在校验或有效但有警告（`warning`）；
- 有效（`success`）；
- 无效（`danger`）。

只有存在具体警告或错误时才显示详情。真实字段发生修改会使旧结果失效；仅切换当前
Profile 不会改变校验状态。较晚返回的 RPC 结果也不会覆盖更新修改的“未校验”状态。

手动校验不会保存 UCI。“保存”会先校验再写入；“保存并应用”会依次校验、通过 LuCI
标准变更机制提交，并调用核心的安全重新加载路径。

## 安全性与依赖

本应用不提供原始 argv、Lua、路径、脚本、nftables 输入、在线测试或配置复位接口。
运行计划仍可通过核心 ubus API 获取，但不会在本界面重复实现。运行依赖仅为
`luci-base` 和 `zapret2`。

## 检查

```sh
for file in htdocs/luci-static/resources/zapret2/v4r31/*.js \
            htdocs/luci-static/resources/view/zapret2/v4r31/*.js; do
    node --check "$file"
done

node tests/test-ui.js
msgfmt --check --check-format -o /dev/null po/zh_Hans/zapret2.po
msgcmp po/zh_Hans/zapret2.po po/templates/zapret2.pot
```
