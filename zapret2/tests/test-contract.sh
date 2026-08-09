#!/bin/sh

set -eu
package_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
compiler=$package_dir/files/usr/libexec/compiler.sh
backend=$package_dir/files/usr/libexec/backend.uc
rpc=$package_dir/files/usr/share/rpcd/ucode/zapret2.uc
acl=$package_dir/files/usr/share/rpcd/acl.d/zapret2.json
init=$package_dir/files/etc/init.d/zapret2
list=$package_dir/files/usr/libexec/zapret2-list
migrate=$package_dir/files/usr/libexec/zapret2-init

sh -n "$compiler"; sh -n "$init"; sh -n "$list"
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$acl"
node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(j.api_version!==1||j.schema_version!==2||!Array.isArray(j.sections))process.exit(1)' "$package_dir/tests/fixtures/valid-basic.json"
[ "$(base64 -d "$package_dir/tests/fixtures/quic-v1-initial.bin.b64" | wc -c)" = 1200 ]

grep -Fq 'plan-dir) plan_dir "$2"' "$compiler"
for artifact in argv rules.nft manifest.json diagnostics.json; do grep -Fq "\$output/$artifact" "$compiler"; done
grep -Fq 'set -- "$PROG" --dry-run' "$compiler"
grep -Fq 'write_rules "$TABLE" "$output/rules.nft"' "$compiler"
grep -Fq "const compiler = '/usr/libexec/zapret2/compiler.sh'" "$backend"
grep -Fq "const API_VERSION = 1" "$rpc"; grep -Fq "const SCHEMA_VERSION = 2" "$rpc"
grep -Fq "failure('unsupported_schema_version', 'schema_version=2 is required.')" "$rpc"
grep -Fq 'return { zapret2: methods }' "$rpc"
for method in info status runtime validate plan service list_index list_get list_put list_delete list_clear log; do grep -Eq "^[[:space:]]*$method:" "$rpc"; done
[ "$(grep -Ec '^[[:space:]]*[a-z_]+: \{ args: \{ api_version: 0, schema_version: 0' "$rpc")" = 12 ]
grep -Fq 'procd_append_param command "$1"' "$init"
grep -Fq 'backup_runtime' "$init"; grep -Fq 'restore_runtime' "$init"
grep -Fq 'last known-good runtime restored' "$init"
grep -Fq '/etc/init.d/nfqws2 stop' "$migrate"
grep -Fq 'auto_domain' "$list"; grep -Fq 'cannot be uploaded' "$list"

if grep -Eq '(^|[^[:alnum:]_])eval([^[:alnum:]_]|$)' "$compiler" "$init"; then echo 'execution path contains eval' >&2; exit 1; fi
if grep -Eq '\buci[[:space:]]+(set|add|add_list|delete|commit|revert|rename)\b' "$compiler" "$list"; then echo 'compiler/list API mutates persistent UCI' >&2; exit 1; fi
if rg -n '\b(finally|throw)\b|luci\.zapret2' "$rpc" "$backend" >/dev/null; then echo 'public backend exposes legacy or unsupported syntax' >&2; exit 1; fi
if grep -Fq 'pidof nfqws2' "$list"; then echo 'list helper signals unrelated nfqws2 processes' >&2; exit 1; fi

echo 'zapret2 schema v2 / API v1 contract checks passed'
