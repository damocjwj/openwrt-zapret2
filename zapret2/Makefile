include $(TOPDIR)/rules.mk

PKG_NAME:=zapret2
PKG_VERSION:=1.0.4
PKG_RELEASE:=8

# Use GitHub's archive route, which accepts the exact source filename that the
# OpenWrt downloader appends and redirects to the immutable codeload archive.
PKG_SOURCE:=v$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://github.com/bol-van/zapret2/archive/refs/tags
PKG_HASH:=3e18cdff2fd3342bd73e44418befaf466446d4c9ad38692406cd5a494c79896c
PKG_BUILD_DIR:=$(BUILD_DIR)/zapret2-$(PKG_VERSION)
# nfqws2 includes sys/capability.h but uses the Linux capability syscalls
# directly, so libcap is required for staging headers only, not at runtime.
PKG_BUILD_DEPENDS:=libcap

PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt
PKG_MAINTAINER:=Damoc
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

define Package/zapret2
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Firewall
  TITLE:=OpenWrt-native integration for the zapret2 NFQUEUE engine
  URL:=https://github.com/damocjwj/openwrt-zapret2
  DEPENDS:=+firewall4 +kmod-nfnetlink-queue +kmod-nft-queue \
	+libnetfilter-queue +libmnl +liblua5.3 +rpcd +ucode +zlib
  PROVIDES:=zapret2-nfqws
  CONFLICTS:=zapret2-nfqws
endef

define Package/zapret2/description
 A non-official, OpenWrt-native integration for the upstream zapret2 nfqws2
 engine. It supports ordered protocol profiles, local domain/IP lists and mark-based traffic
 selection. The service is disabled and its mark allowlist is empty by default.
endef

define Build/Compile
	$(MAKE) -C $(PKG_BUILD_DIR)/nfq2 $(TARGET_CONFIGURE_OPTS) \
		LUA_JIT=0 \
		LUA_CFLAGS="-I$(STAGING_DIR)/usr/include/lua5.3" \
		LUA_LIB="-L$(STAGING_DIR)/usr/lib -llua5.3"
endef

define Package/zapret2/conffiles
/etc/config/zapret2
endef

define Package/zapret2/postinst
#!/bin/sh
mkdir -p "$${IPKG_INSTROOT}/etc/zapret2/lists" "$${IPKG_INSTROOT}/etc/zapret2/autohostlists" "$${IPKG_INSTROOT}/etc/zapret2/legacy"
chown 0:1 "$${IPKG_INSTROOT}/etc/zapret2/lists" "$${IPKG_INSTROOT}/etc/zapret2/autohostlists"
chmod 0750 "$${IPKG_INSTROOT}/etc/zapret2/lists"
chmod 0750 "$${IPKG_INSTROOT}/etc/zapret2/autohostlists"
chmod 0700 "$${IPKG_INSTROOT}/etc/zapret2/legacy"
find "$${IPKG_INSTROOT}/etc/zapret2/lists" -maxdepth 1 -type f \( -name '*.domain' -o -name '*.ip' \) \
	-exec chown 0:1 {} \; -exec chmod 0640 {} \;
[ -n "$${IPKG_INSTROOT}" ] || {
	[ "$$(uci -q get zapret2.main.schema_version)" = 2 ] || /usr/libexec/zapret2-init
	/etc/init.d/rpcd reload >/dev/null 2>&1 || true
}
endef

define Package/zapret2/install
	$(INSTALL_DIR) $(1)/usr/sbin $(1)/usr/share/zapret2/lua
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/nfq2/nfqws2 $(1)/usr/sbin/nfqws2
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/lua/zapret-lib.lua $(1)/usr/share/zapret2/lua/
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/lua/zapret-antidpi.lua $(1)/usr/share/zapret2/lua/
	$(INSTALL_DATA) ./files/etc/config/zapret2 $(1)/usr/share/zapret2/zapret2-v2-default
	$(INSTALL_DIR) $(1)/etc/config $(1)/etc/init.d $(1)/usr/libexec/zapret2 $(1)/lib/upgrade/keep.d \
		$(1)/usr/share/rpcd/ucode $(1)/usr/share/rpcd/acl.d
	$(INSTALL_CONF) ./files/etc/config/zapret2 $(1)/etc/config/zapret2
	$(INSTALL_BIN) ./files/etc/init.d/zapret2 $(1)/etc/init.d/zapret2
	$(INSTALL_BIN) ./files/usr/libexec/compiler.sh $(1)/usr/libexec/zapret2/compiler.sh
	$(INSTALL_DATA) ./files/usr/libexec/backend.uc $(1)/usr/libexec/zapret2/backend.uc
	$(INSTALL_BIN) ./files/usr/libexec/zapret2-list $(1)/usr/libexec/zapret2-list
	$(INSTALL_BIN) ./files/usr/libexec/zapret2-init $(1)/usr/libexec/zapret2-init
	$(INSTALL_DATA) ./files/usr/share/rpcd/ucode/zapret2.uc $(1)/usr/share/rpcd/ucode/zapret2.uc
	$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/zapret2.json $(1)/usr/share/rpcd/acl.d/zapret2.json
	$(INSTALL_DATA) ./files/lib/upgrade/keep.d/zapret2 $(1)/lib/upgrade/keep.d/zapret2
endef

$(eval $(call BuildPackage,zapret2))
