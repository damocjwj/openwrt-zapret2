# Architecture and interfaces

[简体中文](architecture.zh_CN.md) · [Project README](../README.md)

This repository integrates the Linux `nfqws2` engine from zapret2 with
OpenWrt. It is not a fork of the upstream packet-processing implementation.

## Components and data flow

```text
LuCI / ubus client
        |
        v
rpcd ucode API (zapret2, API v1)
        |
        +---- saved UCI or bounded candidate JSON
        v
private deterministic compiler
        +---- normalized diagnostics and manifest
        +---- one nfqws2 argument per line
        +---- complete inet zapret2 transaction
        v
procd / nfqws2 / nftables
```

- `/etc/config/zapret2` is the only persistent policy source and uses schema
  version 2. Candidate JSON is temporary, size-bounded and uses the same schema.
- The rpcd ucode object validates request versions, bounds data and exposes
  fixed operations. It does not reproduce Profile or action semantics.
- The private compiler reads saved UCI or a normalized candidate, validates the
  entire configuration and emits argv, rules, a manifest and diagnostics.
- procd manages only the validated `nfqws2` process lifecycle.

Candidate validation, planning and service startup use the same compiler.
`nfqws2 --dry-run` and `nft -c` must both succeed before rules can be applied.

## Public API

Every request supplies `api_version=1` and `schema_version=2`; every response
echoes both versions and contains either `ok=true,data` or `ok=false,error`.

Read methods:

- `info`: capabilities, action parameters and limits;
- `status`: service state, applied state and nftables counters;
- `runtime`: bounded applied manifest, argv and optional rules;
- `validate`: validate saved UCI or a complete candidate;
- `plan`: return the normalized plan without applying it;
- `log`: at most 100 lines and 32 KiB;
- `list_index` and `list_get`: list metadata and bounded content.

Write methods:

- `service`: only `start`, `stop`, `reload` and `restart`;
- `list_put`, `list_delete` and `list_clear`: validated list operations.

The API never commits UCI. LuCI validates a complete browser-side candidate,
uses the standard UCI change mechanism to save it, then explicitly requests a
reload after changes are applied.

## Compiler and rollback guarantees

The compiler validates schema fields, IDs, profile and step order, transport
compatibility, ports, L7/payload combinations, list references, marks, queues,
interfaces and flow-offload state. Limits include 8 Profiles, 32 steps per
Profile, 128 total steps, 32 selection marks and 64 aggregate port ranges per
transport and queue mode.

The generated argument set is an argv array represented as one value per line;
there is no shell expansion or free-form command input. nftables output is a
complete transaction confined to `inet zapret2`.

Reload compiles and checks a new plan before touching the active state. An
invalid reload leaves the old process, argv and rules intact. Runtime metadata
is staged before commit; if the state commit fails after nftables replacement,
the previous table and metadata are restored.

## Traffic interception

The OpenWrt layer consumes generic packet marks and logical networks. It does
not recognize proxies or business-policy names.

- `marked` mode requires at least one include mark when the service is enabled.
- `all` mode selects all otherwise eligible traffic and emits a warning because
  proxy or VPN tunnels may also be captured.
- Exclude marks always take precedence over include marks or `all` mode.
- Forwarded and router-local traffic can be selected independently.
- Selected connections use a private single-bit conntrack mark for return
  traffic. Generated packets use a different single-bit mark for recursion
  prevention and predefrag `notrack`.

The generated rules derive explicit TCP, UDP, ICMP and IP-protocol filters from
enabled Profiles. Queue mode runs before `nfqws2` can choose a Profile, so
overlapping ports cannot mix `initial` and `keepalive` modes.

Zapret2 rejects standard software or hardware flow offload rather than changing
firewall settings automatically. It creates and removes only `inet zapret2`.

## Profiles, steps and lists

Profiles are ordered; the first enabled matching Profile wins. Profile filters
cover address family, explicit transport ports, ICMP/IP protocols, L7 types,
domain/IP include and exclude entries, local list references and managed
automatic hostlists. Exclusions take precedence within their filter dimension.

Steps retain upstream command-order semantics. Payload and inbound/outbound
range steps affect only subsequent actions in the same Profile. The capability
registry is returned by `info`; LuCI renders that registry but the compiler is
the authority for compatibility and parameter bounds.

Static domain and IP lists live under `/etc/zapret2/lists/`. Managed automatic
hostlists use stable Profile-derived paths under `/etc/zapret2/autohostlists/`.
IDs, types, entries, sizes, permissions and references are validated. Static
list writes use same-directory temporary files and atomic replacement; relevant
updates signal the running engine without rebuilding unrelated services.

## Security boundary

The public interfaces do not accept arbitrary Lua, scripts, argv, command
strings, filesystem paths, raw blobs or nftables input. Remote downloads,
server mode, platform-specific WinDivert/BSD options, blockcheck and tools are
outside the package scope.

Zapret2 owns only its UCI configuration, list directories,
`/var/run/zapret2`, bounded log access and `inet zapret2`. Stop and failed reload
paths do not modify firewall4, routes, proxies or unrelated nftables tables.
