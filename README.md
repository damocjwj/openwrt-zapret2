# openwrt-zapret2

An unofficial, OpenWrt-native integration of the upstream
[zapret2](https://github.com/bol-van/zapret2) NFQUEUE engine, together with a
LuCI management application.

The upstream zapret2 source is downloaded unchanged from the fixed `v1.0.4`
tag and verified by SHA-256. This repository supplies the OpenWrt integration
layer: UCI configuration, a versioned ubus API, a deterministic compiler for
`nfqws2` arguments and nftables rules, procd lifecycle management, validated
local lists, and LuCI pages.

The service is disabled by default. Its default interception mode is `marked`
and its include-mark list is empty, so installing the package does not capture
traffic until an administrator explicitly configures it.

## Packages

- `zapret2` `1.0.4-r4`: engine package and OpenWrt control plane.
- `luci-app-zapret2` `4.0.0-r10`: API v1 / UCI schema v2 LuCI client.
- `luci-i18n-zapret2-zh-cn`: generated Simplified Chinese translation package.

`zapret2-tools`, arbitrary scripts, arbitrary argv, user Lua, remote list
downloads and blockcheck are intentionally outside this repository's scope.

## Use as an OpenWrt feed

Add the following line to `feeds.conf.default`:

```text
src-git zapret2 https://github.com/damocjwj/openwrt-zapret2.git
```

Then update and install the packages:

```sh
./scripts/feeds update zapret2
./scripts/feeds install -p zapret2 zapret2 luci-app-zapret2
make menuconfig
```

Select `Network -> Firewall -> zapret2` and `LuCI -> Applications ->
luci-app-zapret2`, then build them with the normal OpenWrt build system.

## Design

```text
LuCI / ubus clients
        |
        v
rpcd ucode API (zapret2, API v1)
        |
        +---- UCI schema v2
        |
        v
private shell compiler
        +---- nfqws2 argv
        +---- inet zapret2 nftables rules
        |
        v
procd / nfqws2 / nft
```

UCI is the only persistent configuration source. Candidate validation,
planning and service startup all call the same private compiler. The compiler
does not accept arbitrary commands, paths, Lua or nftables text. Zapret2 only
manages its own runtime directory and `inet zapret2` table.

See [docs/architecture.md](docs/architecture.md) for the API and safety
boundaries. The optional [Nikki marked-direct example](examples/nikki-marked-direct.yaml)
shows one way an external policy engine can supply a generic packet mark;
Zapret2 itself has no built-in knowledge of Nikki, Mihomo or `DIRECT`.

## Development checks

```sh
sh zapret2/tests/test-contract.sh

for file in luci-app-zapret2/htdocs/luci-static/resources/zapret2/v4r10/*.js \
            luci-app-zapret2/htdocs/luci-static/resources/view/zapret2/v4r10/*.js; do
    node --check "$file"
done

node luci-app-zapret2/tests/test-ui.js
msgfmt --check --check-format -o /dev/null \
    luci-app-zapret2/po/zh_Hans/zapret2.po
```

Device runtime tests under `zapret2/tests/` are opt-in and may temporarily
change the Zapret2 or external policy-engine runtime. Read each script before
running it on a router.

## License

The OpenWrt integration and LuCI application are released under the MIT
License. The downloaded upstream zapret2 source retains its own license and
copyright notices.
