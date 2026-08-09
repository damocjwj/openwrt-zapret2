#!/bin/sh

set -eu

CONFIG_BACKUP=$(mktemp /tmp/zapret2-rollback-config.XXXXXX)
REAL=/usr/sbin/nfqws2.rollback-test
cp /etc/config/zapret2 "$CONFIG_BACKUP"

cleanup() {
	set +e
	[ ! -e "$REAL" ] || { rm -f /usr/sbin/nfqws2; mv "$REAL" /usr/sbin/nfqws2; }
	/etc/init.d/zapret2 stop >/dev/null 2>&1
	cp "$CONFIG_BACKUP" /etc/config/zapret2
	rm -f "$CONFIG_BACKUP"
}
trap cleanup EXIT INT TERM

uci -q set zapret2.main.enabled=1
uci -q add_list zapret2.main.include_mark=0x10000000/0x10000000
uci -q commit zapret2
/etc/init.d/zapret2 start
sleep 2
/etc/init.d/zapret2 running

argv_before=$(sha256sum /var/run/zapret2/argv | awk '{print $1}')
rules_before=$(sha256sum /var/run/zapret2/rules.nft | awk '{print $1}')
mv /usr/sbin/nfqws2 "$REAL"
cat >/usr/sbin/nfqws2 <<'EOF'
#!/bin/sh
if [ "${1:-}" = --dry-run ]; then exec /usr/sbin/nfqws2.rollback-test "$@"; fi
case " $* " in *' --lua-desync=multisplit:pos=2 '*) exit 70;; esac
exec /usr/sbin/nfqws2.rollback-test "$@"
EOF
chmod 0755 /usr/sbin/nfqws2

uci -q set zapret2.tls_split.position=2
uci -q commit zapret2
if /etc/init.d/zapret2 reload; then
	echo 'runtime launch failure reload unexpectedly succeeded' >&2
	exit 1
fi
/etc/init.d/zapret2 running
[ "$(sha256sum /var/run/zapret2/argv | awk '{print $1}')" = "$argv_before" ]
[ "$(sha256sum /var/run/zapret2/rules.nft | awk '{print $1}')" = "$rules_before" ]
grep -Fq 'restored last known-good runtime' /var/run/zapret2/last_error

echo 'zapret2 valid-plan launch failure rollback passed'
