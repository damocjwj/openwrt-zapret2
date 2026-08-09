#!/bin/sh

set -eu

fixture_dir=${1:-.}
compiler=/usr/libexec/zapret2/compiler.sh
mkdir -m 700 -p /var/run/zapret2
candidate=$(mktemp -d /var/run/zapret2/candidate-XXXXXX)
current=$(mktemp -d /var/run/zapret2/candidate-XXXXXX)
saved_config=$candidate/saved-config
cp /etc/config/zapret2 "$saved_config"

cleanup() {
	cp "$saved_config" /etc/config/zapret2 2>/dev/null || true
	case "$candidate" in
		/var/run/zapret2/candidate-[A-Za-z0-9]*)
			[ -d "$candidate" ] && [ ! -L "$candidate" ] && rm -rf "$candidate"
			;;
	esac
	case "$current" in
		/var/run/zapret2/candidate-[A-Za-z0-9]*)
			[ -d "$current" ] && [ ! -L "$current" ] && rm -rf "$current"
			;;
	esac
}
trap cleanup EXIT INT TERM

cp "$fixture_dir/valid-basic" "$candidate/zapret2"
"$compiler" plan-dir "$candidate"
for artifact in argv rules.nft wan_devices source_devices summary manifest.json diagnostics.json; do
	[ -s "$candidate/plan/$artifact" ] || { echo "missing plan artifact: $artifact" >&2; exit 1; }
done
first=$(sha256sum "$candidate/plan/argv" "$candidate/plan/rules.nft" "$candidate/plan/summary" "$candidate/plan/manifest.json" "$candidate/plan/diagnostics.json")
"$compiler" plan-dir "$candidate"
second=$(sha256sum "$candidate/plan/argv" "$candidate/plan/rules.nft" "$candidate/plan/summary" "$candidate/plan/manifest.json" "$candidate/plan/diagnostics.json")
[ "$first" = "$second" ] || { echo 'compiler output is not deterministic' >&2; exit 1; }

# The candidate and saved-UCI paths must be byte-identical for the same
# declaration; actual start/reload uses this same saved-UCI compiler path.
cp "$fixture_dir/valid-basic" /etc/config/zapret2
"$compiler" plan-current "$current"
for artifact in argv rules.nft manifest.json diagnostics.json; do
	cmp -s "$candidate/plan/$artifact" "$current/plan/$artifact" || { echo "candidate/current compiler drift: $artifact" >&2; exit 1; }
done
cp "$saved_config" /etc/config/zapret2

auto_list=/etc/zapret2/autohostlists/contract_auto.domain
[ ! -e "$auto_list" ] || { echo "test autohostlist already exists: $auto_list" >&2; exit 1; }
cp "$fixture_dir/valid-expanded" "$candidate/zapret2"
"$compiler" plan-dir "$candidate"
grep -Fq -- '--filter-icmp=8:0' "$candidate/plan/argv"
grep -Fq -- '--payload=icmp' "$candidate/plan/argv"
grep -Fq -- '--filter-ipp=47' "$candidate/plan/argv"
grep -Fq -- '--hostlist-auto=/etc/zapret2/autohostlists/contract_auto.domain' "$candidate/plan/argv"
grep -Fq -- '--lua-desync=rst:rstack:dir=out' "$candidate/plan/argv"
grep -Fq 'meta l4proto { 47 }' "$candidate/plan/rules.nft"
for action in drop send pktmod rst http_hostcase http_domcase http_methodeol http_unixeol \
	wsize wssize syndata tls_client_hello_clone fake multisplit multidisorder \
	multidisorder_legacy fakedsplit fakeddisorder hostfakesplit tcpseg oob udplen dht_dn \
	synack synack_split; do
	grep -Fq -- "--lua-desync=$action" "$candidate/plan/argv" || {
		echo "structured action did not reach the generated argv: $action" >&2
		exit 1
	}
done
[ ! -e "$auto_list" ] || { echo 'candidate dry-run changed the managed autohostlist directory' >&2; exit 1; }

cp "$fixture_dir/invalid-unknown-option" "$candidate/zapret2"
if "$compiler" plan-dir "$candidate" >/dev/null 2>&1; then
	echo 'unknown option was accepted' >&2
	exit 1
fi

cp "$fixture_dir/invalid-mark" "$candidate/zapret2"
if "$compiler" plan-dir "$candidate" >/dev/null 2>&1; then
	echo 'invalid mark was accepted' >&2
	exit 1
fi

echo 'zapret2 OpenWrt compiler fixtures passed'
