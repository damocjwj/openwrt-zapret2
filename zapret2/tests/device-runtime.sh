#!/bin/sh

set -eu

CONFIG=/etc/config/zapret2
BACKUP=$(mktemp /tmp/zapret2-device-config.XXXXXX)
TEST_TABLE=zapret2_contract_$$
TEST_LIST=contract_$$
TEST_LIST_CREATED=0
NIKKI_STOPPED=0
ZAPRET2_WAS_RUNNING=0

cp "$CONFIG" "$BACKUP"

cleanup() {
	set +e
	nft delete table inet "$TEST_TABLE" 2>/dev/null
	[ "$TEST_LIST_CREATED" != 1 ] || rm -f "/etc/zapret2/lists/$TEST_LIST.domain"
	cp "$BACKUP" "$CONFIG"
	rm -f "$BACKUP"
	/etc/init.d/zapret2 stop >/dev/null 2>&1
	[ "$ZAPRET2_WAS_RUNNING" != 1 ] || /etc/init.d/zapret2 start >/dev/null 2>&1
	if [ "$NIKKI_STOPPED" = 1 ]; then
		/etc/init.d/nikki start >/dev/null 2>&1
	fi
}
trap cleanup EXIT INT TERM

/etc/init.d/zapret2 running >/dev/null 2>&1 && ZAPRET2_WAS_RUNNING=1
[ ! -e "/etc/zapret2/lists/$TEST_LIST.domain" ] || {
	echo "test list already exists: $TEST_LIST" >&2
	exit 1
}
/etc/init.d/zapret2 stop >/dev/null 2>&1 || true

status_value() {
	ubus call zapret2 status '{"api_version":1,"schema_version":2}' | jsonfilter -e "@.data.$1"
}

ubus call zapret2 list_put \
	"{\"api_version\":1,\"schema_version\":2,\"id\":\"$TEST_LIST\",\"type\":\"domain\",\"content\":\"www.bilibili.com\\n\"}" \
	| grep -Fq '"ok": true'
TEST_LIST_CREATED=1
[ "$(ls -ldn /etc/zapret2/lists | awk '{print $1":"$4}')" = 'drwxr-x---:1' ]
[ "$(ls -ln "/etc/zapret2/lists/$TEST_LIST.domain" | awk '{print $1":"$4}')" = '-rw-r-----:1' ]

uci -q set zapret2.main.enabled=1
uci -q add_list zapret2.main.include_mark=0x10000000/0x10000000
uci -q add_list zapret2.tls_default.domain_list="$TEST_LIST"
uci -q commit zapret2
/etc/init.d/zapret2 start
sleep 1

first_pid=$(status_value pid)
case "$first_pid" in ''|*[!0-9]*) echo 'zapret2 did not start under procd' >&2; exit 1 ;; esac
[ "$(status_value table_present)" = true ]

# List updates must signal only the procd-owned zapret2 instance and must not
# restart or terminate it.
ubus call zapret2 list_put \
	"{\"api_version\":1,\"schema_version\":2,\"id\":\"$TEST_LIST\",\"type\":\"domain\",\"content\":\"www.bilibili.com\\n^www.bilibili.com\\n\",\"old_id\":\"$TEST_LIST\",\"old_type\":\"domain\"}" \
	| grep -Fq '"ok": true'
sleep 1
[ "$(status_value pid)" = "$first_pid" ]
if ubus call zapret2 list_delete \
	"{\"api_version\":1,\"schema_version\":2,\"id\":\"$TEST_LIST\",\"type\":\"domain\"}" | grep -Fq '"ok": true'; then
	echo 'referenced list was deleted unexpectedly' >&2
	exit 1
fi

# Keep the list reload test separate from the generic mark/NFQUEUE test. The
# latter uses a literal IP so it remains independent of the router's DNS
# forwarding policy and any concurrently installed transparent proxy.
uci -q del_list zapret2.tls_default.domain_list="$TEST_LIST"
uci -q commit zapret2
/etc/init.d/zapret2 reload
sleep 1
first_pid=$(status_value pid)
case "$first_pid" in ''|*[!0-9]*) echo 'zapret2 did not reload after removing the test list' >&2; exit 1 ;; esac

argv_before=$(sha256sum /var/run/zapret2/argv | awk '{print $1}')
rules_before=$(sha256sum /var/run/zapret2/rules.nft | awk '{print $1}')
uci -q set zapret2.main.contract_unknown=1
uci -q commit zapret2
if /etc/init.d/zapret2 reload >/dev/null 2>&1; then
	echo 'invalid reload unexpectedly succeeded' >&2
	exit 1
fi
[ "$(status_value pid)" = "$first_pid" ]
[ "$(sha256sum /var/run/zapret2/argv | awk '{print $1}')" = "$argv_before" ]
[ "$(sha256sum /var/run/zapret2/rules.nft | awk '{print $1}')" = "$rules_before" ]
grep -Fq 'unsupported option' /var/run/zapret2/last_error

uci -q delete zapret2.main.contract_unknown
uci -q set zapret2.main.tcp_out_packets=21
uci -q set zapret2.main.process_local=1
uci -q commit zapret2
/etc/init.d/zapret2 reload
sleep 1
[ "$(status_value running)" = true ]
[ "$(status_value config_state)" = applied ]
grep -Fq 'ct original packets 1-21' /var/run/zapret2/rules.nft

nft "add table inet $TEST_TABLE"
nft "add chain inet $TEST_TABLE output { type route hook output priority mangle; policy accept; }"
nft "add rule inet $TEST_TABLE output tcp dport 443 counter meta mark set meta mark | 0x10000000"
# Keep this generic OpenWrt/NFQUEUE contract independent of a transparent
# proxy. The separate nikki-chain.sh test covers their real integration.
if /etc/init.d/nikki running >/dev/null 2>&1; then
	/etc/init.d/nikki stop
	NIKKI_STOPPED=1
fi
wget -T 5 -O /dev/null https://1.1.1.1/ >/dev/null 2>&1 || true
sleep 1
queued=$(status_value counters.tcp_out.packets)
case "$queued" in ''|*[!0-9]*|0) echo 'marked HTTPS flow did not enter NFQUEUE' >&2; exit 1 ;; esac

echo "zapret2 runtime contract passed (queued TCP packets: $queued)"
