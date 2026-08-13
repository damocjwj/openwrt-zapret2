#!/bin/sh

set -eu
MIXIN=${1:-/tmp/zapret2-fixtures/nikki-marked-direct.yaml}
WORK=$(mktemp -d /tmp/zapret2-nikki-chain.XXXXXX)
cp /etc/config/zapret2 "$WORK/zapret2"
uci -q export nikki >"$WORK/nikki.uci"
cp /etc/nikki/mixin.yaml "$WORK/mixin.yaml"
NIKKI_WAS_RUNNING=0
ZAPRET2_WAS_RUNNING=0
/etc/init.d/nikki running >/dev/null 2>&1 && NIKKI_WAS_RUNNING=1
/etc/init.d/zapret2 running >/dev/null 2>&1 && ZAPRET2_WAS_RUNNING=1

cleanup() {
	rc=$?
	trap - EXIT INT TERM
	set +e
	/etc/init.d/zapret2 stop >/dev/null 2>&1
	cp "$WORK/zapret2" /etc/config/zapret2
	uci -q commit zapret2
	[ "$ZAPRET2_WAS_RUNNING" != 1 ] || /etc/init.d/zapret2 start >/dev/null 2>&1
	cp "$WORK/mixin.yaml" /etc/nikki/mixin.yaml
	uci -q revert nikki
	uci -q import nikki <"$WORK/nikki.uci"
	uci -q commit nikki
	if [ "$NIKKI_WAS_RUNNING" = 1 ]; then
		/etc/init.d/nikki restart >/dev/null 2>&1
	else
		/etc/init.d/nikki stop >/dev/null 2>&1
	fi
	rm -rf "$WORK"
	exit "$rc"
}
trap cleanup EXIT INT TERM

cp "$MIXIN" /etc/nikki/mixin.yaml
uci -q add_list nikki.@router_access_control[0].cgroup='services/zapret2'
uci -q set nikki.config.test_profile='0'
uci -q set nikki.mixin.mixin_file_content='1'
uci -q commit nikki
/etc/init.d/nikki restart
ready=0; wait_step=0
# The 4G board needs several minutes for Nikki's yq/geosite merge. Wait for
# both the replacement core and the exact generated marker, not merely for the
# old mihomo process to disappear.
while [ "$wait_step" -lt 180 ]; do
	if pidof mihomo >/dev/null 2>&1 && grep -Fq 'ZAPRET2-DIRECT-TEST' /etc/nikki/run/config.yaml 2>/dev/null; then ready=1; break; fi
	wait_step=$((wait_step + 1)); sleep 2
done
[ "$ready" = 1 ] || { echo 'Nikki did not apply the temporary marked-direct mixin within 360 seconds' >&2; exit 1; }
grep -Eq 'routing-mark:[[:space:]]*"?268435456"?[[:space:]]*$' /etc/nikki/run/config.yaml

uci -q set zapret2.main.enabled=1
uci -q add_list zapret2.main.include_mark='0x10000000/0x10000000'
uci -q set zapret2.main.process_local=1
uci -q commit zapret2
/etc/init.d/zapret2 start
sleep 1

counter() {
	ubus call zapret2 status '{"api_version":1,"schema_version":2}' | jsonfilter -e '@.data.counters.tcp_out.packets'
}

stable_counter() {
	local previous current stable=0 count=0
	previous=$(counter)
	while [ "$count" -lt 20 ]; do
		sleep 1; current=$(counter); count=$((count + 1))
		if [ "$current" = "$previous" ]; then
			stable=$((stable + 1)); [ "$stable" -ge 3 ] && { echo "$current"; return 0; }
		else
			previous=$current; stable=0
		fi
	done
	echo "$previous"
}

before=$(stable_counter)
set +e
curl -4 -k -L --max-time 15 -o /dev/null -sS -w '%{http_code}\n' https://www.bilibili.com/ >"$WORK/bilibili.code"
bilibili_rc=$?
set -e
after_direct=$(stable_counter)
[ "$after_direct" -gt "$before" ] || { echo "Nikki marked direct flow did not reach Zapret2 (curl rc $bilibili_rc)" >&2; exit 1; }

before_proxy=$after_direct
set +e
curl -4 -k -L --max-time 15 -o /dev/null -sS -w '%{http_code}\n' https://github.com/ >"$WORK/github.code"
github_rc=$?
set -e
after_proxy=$(stable_counter)
[ "$after_proxy" -eq "$before_proxy" ] || { echo "unmarked proxy flow unexpectedly reached Zapret2 ($before_proxy -> $after_proxy)" >&2; exit 1; }

printf 'Nikki marked-direct chain passed (TCP queue %s -> %s; Bilibili HTTP %s; GitHub HTTP %s)\n' \
	"$before" "$after_direct" "$(cat "$WORK/bilibili.code")/$bilibili_rc" "$(cat "$WORK/github.code")/$github_rc"
