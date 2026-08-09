# luci-app-zapret2

Native LuCI client for the versioned OpenWrt control plane provided by the
`zapret2` core package. Version 4 uses ubus object `zapret2`, API v1 and UCI
schema v2 directly. It does not install an rpcd implementation of its own.
The `zapret2/v4r10/` browser module namespace is intentional: it prevents an
older LuCI RPC or strategy module cached by the browser from being reused after
an IPK-only upgrade whose firmware-wide static resource version did not change.

The interface has four pages:

- Plugin configuration edits OpenWrt interception, queues and runtime options,
  shows lightweight counters, and loads the applied argv or nft plan only on
  request.
- Strategy configuration manages ordered upstream-style Profiles and ordered
  payload/range/action steps. Each Profile has an independently expandable
  LuCI-native responsive step table, while the backend `info` registry
  determines which actions and parameters are available.
- Local lists manages validated static domain/IP lists and read-only managed
  automatic hostlists through the core list API.
- Log follows the bounded Zapret2 syslog tail at LuCI's global polling interval.

UCI is the only persistent configuration source. Before LuCI stages a form
save, it encodes the complete browser-side UCI state as the documented
`{api_version,schema_version,sections[].{name,type,options,lists}}` candidate and
calls the core `validate` method. Save & Apply commits the validated UCI changes
and then uses the core's rollback-safe `service reload` path. Candidate planning
and applied runtime details remain clearly separated.

The application has no raw argv, Lua, path, script, nft input, online test or
configuration reset API. Static list writes remain bounded and atomic in the
core package. Runtime dependencies are limited to `luci-base` and `zapret2`.

Basic checks:

```sh
for f in htdocs/luci-static/resources/zapret2/v4r10/*.js \
	 htdocs/luci-static/resources/view/zapret2/v4r10/*.js; do node --check "$f"; done
node tests/test-ui.js
```
