# luci-app-zapret2

Native LuCI client for the versioned OpenWrt control plane provided by the
`zapret2` core package. Version 4 uses ubus object `zapret2`, API v1 and UCI
schema v2 directly. It does not install an rpcd implementation of its own.
The `zapret2/v4r30/` browser module namespace is intentional: it prevents an
older LuCI RPC or strategy module cached by the browser from being reused after
an IPK-only upgrade whose firmware-wide static resource version did not change.

The interface has four pages:

- Zapret2 edits OpenWrt interception, queues and runtime options and shows
  service state and lightweight counters. Service actions are located in the
  status table; configuration is validated when it is saved.
- Profiles uses an ordered overview and a focused workspace. Each row shows
  the Profile status and an explicit enable or disable action, while the
  selected Profile exposes its filters and complete ordered step table. The
  backend `info` registry determines which actions and parameters are available.
- Local lists manages validated static domain/IP lists and read-only managed
  automatic hostlists through the core list API.
- Log uses a read-only LuCI form to display the bounded Zapret2 syslog tail,
  with manual refresh, automatic polling and a scroll-to-bottom action.

UCI is the only persistent configuration source. Before LuCI stages a form
save, it encodes the complete browser-side UCI state as the documented
`{api_version,schema_version,sections[].{name,type,options,lists}}` candidate and
calls the core `validate` method. Save & Apply commits the validated UCI changes
and then uses the core's rollback-safe `service reload` path. Runtime planning
and applied-state inspection remain available through the core API but are not
duplicated in the settings interface.

The application has no raw argv, Lua, path, script, nft input, online test or
configuration reset API. Static list writes remain bounded and atomic in the
core package. Runtime dependencies are limited to `luci-base` and `zapret2`.

Basic checks:

```sh
for f in htdocs/luci-static/resources/zapret2/v4r30/*.js \
	 htdocs/luci-static/resources/view/zapret2/v4r30/*.js; do node --check "$f"; done
node tests/test-ui.js
```
