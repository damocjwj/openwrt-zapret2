#!/bin/sh

set -eu

BACKUP=$(mktemp /tmp/zapret2-autohost-config.XXXXXX)
AUTO=/etc/zapret2/autohostlists/tls_default.domain
cp /etc/config/zapret2 "$BACKUP"

cleanup() {
	set +e
	/etc/init.d/zapret2 stop >/dev/null 2>&1
	cp "$BACKUP" /etc/config/zapret2
	rm -f "$BACKUP" "$AUTO"
}
trap cleanup EXIT INT TERM

uci -q set zapret2.main.enabled=1
uci -q add_list zapret2.main.include_mark=0x10000000/0x10000000
uci -q set zapret2.tls_default.autohostlist=1
uci -q commit zapret2
/etc/init.d/zapret2 start

count=0
while [ "$count" -lt 10 ] && [ ! -f "$AUTO" ]; do count=$((count + 1)); sleep 1; done
[ -f "$AUTO" ] || { echo 'nfqws2 did not initialize its managed autohostlist' >&2; exit 1; }
[ "$(ls -ln "$AUTO" | awk '{print $4":"$1}')" = '1:-rw-rw----' ]
ubus call zapret2 list_index '{"api_version":1,"schema_version":2}' | grep -Fq '"type": "auto_domain"'
ubus call zapret2 list_get '{"api_version":1,"schema_version":2,"id":"tls_default","type":"auto_domain"}' | grep -Fq '"ok": true'
ubus call zapret2 list_clear '{"api_version":1,"schema_version":2,"id":"tls_default","type":"auto_domain"}' | grep -Fq '"ok": true'
[ ! -s "$AUTO" ]

echo 'zapret2 managed autohostlist runtime contract passed'
