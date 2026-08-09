# Architecture and interfaces

This repository integrates the Linux `nfqws2` engine from zapret2 with
OpenWrt. It is not a fork of the upstream packet-processing implementation.

## Control and execution planes

- `/etc/config/zapret2` is the sole persistent configuration source and uses
  schema version 2.
- The rpcd object `zapret2` exposes API version 1 for capability discovery,
  status, validation, planning, service control, logs and bounded list CRUD.
- The private shell compiler owns configuration normalization and semantics.
  It emits one argument per line, a complete `inet zapret2` nftables plan, a
  normalized manifest and structured diagnostics.
- Candidate planning and actual startup use the same compiler. Valid plans are
  checked with `nfqws2 --dry-run` and `nft -c` before application.
- procd only manages the validated `nfqws2` process lifecycle. Stop and failed
  reload paths do not alter firewall4, routing, proxies or unrelated tables.

## Public API

Every ubus request and response carries `api_version=1` and
`schema_version=2`. The object exposes:

- `info`, `status`, `runtime`, `validate`, `plan` and bounded `log` reads;
- `service` with only `start|stop|reload|restart` actions;
- `list_index`, `list_get`, `list_put`, `list_delete` and `list_clear` for
  validated static or managed automatic lists.

The API does not commit UCI configuration. Clients save with the standard UCI
interface, validate a complete candidate before commit, and explicitly request
a service reload after applying the saved configuration.

## Traffic interception

The OpenWrt layer accepts generic include and exclude packet marks, selected
WAN and source logical networks, and separate local/forwarded traffic controls.
It does not recognize applications or business-policy names. Exclude marks take
precedence. `all` mode requires an explicit risk acknowledgement.

Selected connections use a private conntrack bit for return traffic. Generated
packets use a separate single-bit mark for recursion prevention and predefrag
notrack. Both bits must be reserved from other firewall components.

The generated nftables rules are derived from enabled Profile filters and are
confined to `inet zapret2`. Standard flow offload configurations that bypass
NFQUEUE are rejected rather than modified automatically.

## Profiles and lists

Profiles are ordered and the first matching enabled Profile wins. Payload and
range steps affect only later actions in the same Profile, preserving upstream
nfqws2 command-order semantics. The capability registry exposes only validated
Linux filters and structured upstream actions.

Static domain and IP lists live under `/etc/zapret2/lists/`. Managed automatic
hostlists use paths derived from stable Profile IDs. IDs, types, sizes,
permissions and references are validated; writes use same-directory temporary
files and atomic replacement.

Arbitrary Lua, scripts, argv, paths, blobs, raw nftables text, remote downloads,
server mode and platform-specific WinDivert/BSD parameters are not exposed.
