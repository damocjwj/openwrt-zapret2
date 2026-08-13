include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for zapret2 traffic selection
LUCI_DEPENDS:=+luci-base +zapret2
LUCI_PKGARCH:=all
LUCI_URL:=https://github.com/damocjwj/openwrt-zapret2
LUCI_MAINTAINER:=Damoc <179361599+damocjwj@users.noreply.github.com>

PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=LICENSE
PKG_VERSION:=4.0.0
PKG_RELEASE:=31
PKG_PO_VERSION:=$(PKG_VERSION)-r$(PKG_RELEASE)

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-zapret2/postinst
[ -n "$${IPKG_INSTROOT}" ] || { \
	rm -f /tmp/luci-indexcache.*; \
	rm -rf /tmp/luci-modulecache/; \
	/etc/init.d/rpcd reload 2>/dev/null; \
	exit 0; \
}
endef

# call BuildPackage - OpenWrt buildroot signature
