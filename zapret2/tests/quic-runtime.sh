#!/bin/sh

set -eu

FIXTURE=${1:-/tmp/quic-initial.bin}
SENDER=${2:-/tmp/zapret2-udp-send}
BACKUP=$(mktemp /tmp/zapret2-quic-config.XXXXXX)
TABLE=zapret2_quic_test
NIKKI_STOPPED=0
cp /etc/config/zapret2 "$BACKUP"
[ "$(wc -c <"$FIXTURE")" = 1200 ] || { echo 'a 1200-byte QUIC v1 Initial fixture is required' >&2; exit 1; }
[ -x "$SENDER" ] || { echo 'the temporary UDP test sender is unavailable' >&2; exit 1; }

cleanup() {
	set +e
	nft delete table inet "$TABLE" 2>/dev/null
	/etc/init.d/zapret2 stop >/dev/null 2>&1
	cp "$BACKUP" /etc/config/zapret2
	rm -f "$BACKUP"
	[ "$NIKKI_STOPPED" != 1 ] || /etc/init.d/nikki start >/dev/null 2>&1
}
trap cleanup EXIT INT TERM

if /etc/init.d/nikki running >/dev/null 2>&1; then /etc/init.d/nikki stop; NIKKI_STOPPED=1; fi
uci -q set zapret2.main.enabled=1
uci -q set zapret2.main.process_local=1
uci -q add_list zapret2.main.include_mark=0x10000000/0x10000000
uci -q set zapret2.quic_default.enabled=1
uci -q commit zapret2
/etc/init.d/zapret2 start
sleep 2

nft "add table inet $TABLE"
nft "add chain inet $TABLE output { type route hook output priority mangle; policy accept; }"
nft "add rule inet $TABLE output udp dport 443 counter meta mark set meta mark | 0x10000000"
before_udp=$(ubus call zapret2 status '{"api_version":1,"schema_version":2}' | jsonfilter -e '@.data.counters.udp_out.packets')
before_generated=$(ubus call zapret2 status '{"api_version":1,"schema_version":2}' | jsonfilter -e '@.data.counters.generated.packets')
"$SENDER" 1.1.1.1 443 "$FIXTURE"
sleep 2
after_udp=$(ubus call zapret2 status '{"api_version":1,"schema_version":2}' | jsonfilter -e '@.data.counters.udp_out.packets')
after_generated=$(ubus call zapret2 status '{"api_version":1,"schema_version":2}' | jsonfilter -e '@.data.counters.generated.packets')
[ "$after_udp" -gt "$before_udp" ] || { echo 'QUIC Initial did not enter the UDP NFQUEUE' >&2; exit 1; }
[ "$after_generated" -gt "$before_generated" ] || { echo 'QUIC fake action did not emit a generated packet' >&2; exit 1; }

echo "zapret2 QUIC Initial runtime passed (UDP $before_udp->$after_udp; generated $before_generated->$after_generated)"
