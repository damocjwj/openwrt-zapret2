# luci-app-zapret2

[简体中文](README.zh_CN.md) · [Project README](../README.md)

Native LuCI client for the versioned OpenWrt control plane provided by the
`zapret2` core package. Version 4 uses ubus object `zapret2`, API v1 and UCI
schema v2 directly; it does not install another rpcd implementation.

The `zapret2/v4r31/` browser namespace prevents cached RPC, strategy or view
modules from an older IPK-only installation from being reused when the global
firmware resource version has not changed.

## Pages

- **Zapret2**: service state, counters, service actions, WAN/source selection,
  mark interception, queue limits and advanced runtime settings.
- **Profiles**: ordered Profile overview and one focused workspace containing
  filters and the complete ordered step table. The backend `info` registry
  determines available actions and parameters.
- **Local lists**: validated domain/IP list CRUD and read-only managed automatic
  hostlists.
- **Log**: bounded read-only syslog output with manual refresh, polling and a
  scroll-to-bottom action.

## Candidate validation

Unsaved form state is encoded as
`{api_version,schema_version,sections[].{name,type,options,lists}}` and passed to
the core `validate` method. The compact validation table displays:

- unvalidated (`notice`);
- validating or valid with warnings (`warning`);
- valid (`success`);
- invalid (`danger`).

Detailed warning or error text appears only when present. Editing a real field
invalidates an earlier result; changing only the focused Profile does not. A
late RPC result cannot overwrite the unvalidated state of newer edits.

Manual validation does not save UCI. `Save` validates before writing, while
`Save & Apply` validates, commits through LuCI's normal change mechanism and
calls the rollback-safe core reload path.

## Security and dependencies

The application exposes no raw argv, Lua, path, script, nftables input, online
test or configuration-reset API. Runtime planning remains available through the
core ubus API but is not duplicated in this interface. Dependencies are limited
to `luci-base` and `zapret2`.

## Checks

```sh
for file in htdocs/luci-static/resources/zapret2/v4r31/*.js \
            htdocs/luci-static/resources/view/zapret2/v4r31/*.js; do
    node --check "$file"
done

node tests/test-ui.js
msgfmt --check --check-format -o /dev/null po/zh_Hans/zapret2.po
msgcmp po/zh_Hans/zapret2.po po/templates/zapret2.pot
```
