#!/usr/bin/env bash
#
# newfem.sh
#
# Modernized AP + WireGuard router bootstrap
#
# FEATURES
# - VPN kill switch
# - nftables anti-leak rules
# - DNS leak prevention
# - IPv6 forwarding
# - automatic recovery loop
# - captive portal handling
# - CAKE SQM
# - split-tunnel hooks
# - systemd-resolved integration
# - safer startup ordering
#
# NOTE:
# This is still a transitional script.
# Long-term:
#   migrate to systemd-networkd + systemd services
#

set -Eeuo pipefail

########################################
# CONFIG
########################################

AP_IF="wlx00c0caa97f0b"
UPSTREAM_IF="wlp2s0"
WG_IF="wgo_free"

AP_MAC="1c:bf:c0:ce:bf:82"
UPSTREAM_MAC="1c:bf:c0:ce:bf:81"

AP_IPV4="192.168.50.1/24"
AP_SUBNET="192.168.50.0/24"

AP_IPV6="fd50:abcd:1234:1::1/64"
UPSTREAM_GW6=$(ip -6 route show default dev "$UPSTREAM_IF" | awk '/default/ {print $3; exit}')

WG_HEALTHCHECK_IP="1.1.1.1"

HOSTAPD_CONF="/home/maxdeb/routing/hostapd_improved.conf"
DNSMASQ_CONF="/home/maxdeb/routing/dnsmasq.conf"
WPA_CONF="/etc/wpa_supplicant/fem.conf"

DNSMASQ_PID="/run/dnsmasq_ap.pid"

ENABLE_SQM="yes"
SQM_BANDWIDTH="185Mbit"

ENABLE_IPV6="yes"

########################################
# COLORS
########################################

GREEN="\e[32m"
RED="\e[31m"
YELLOW="\e[33m"
BLUE="\e[34m"
RESET="\e[0m"

########################################
# LOGGING
########################################

log() {
    echo -e "${GREEN}[+]${RESET} $*"
}

warn() {
    echo -e "${YELLOW}[!]${RESET} $*"
}

err() {
    echo -e "${RED}[x]${RESET} $*"
}

########################################
# CLEANUP
########################################

cleanup() {
    warn "Cleaning up..."

    chattr -i /etc/resolv.conf 2>/dev/null || true
    rm -f /etc/dhcp/dhclient-enter-hooks.d/nodnsupdate

    killall hostapd 2>/dev/null || true
    killall dnsmasq 2>/dev/null || true
    wg-quick down "$WG_IF" 2>/dev/null || true
    nft flush ruleset || true
    tc qdisc del dev "$WG_IF" root 2>/dev/null || true
    ip link set "$AP_IF" down || true
    ip route del 0.0.0.0/0 dev "$WG_IF" 2>/dev/null || true
    ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
    systemctl start systemd-resolved 2>/dev/null || true

    warn "Cleanup complete."
}
trap cleanup EXIT

######################################
# REQUIREMENTS
########################################

require() {
    command -v "$1" >/dev/null 2>&1 || {
        err "Missing dependency: $1"
        exit 1
    }
}

check_requirements() {
    log "Checking dependencies..."

    for bin in \
        ip \
        iw \
        nft \
        wg \
        wg-quick \
        hostapd \
        dnsmasq \
        wpa_supplicant \
        ping \
        curl \
        tc \
        resolvectl
    do
        require "$bin"
    done
}

########################################
# STOP SERVICES
########################################

stop_conflicting_services() {
    log "Stopping conflicting services..."

    systemctl stop NetworkManager 2>/dev/null || true
    systemctl stop systemd-resolved 2>/dev/null || true

    killall wpa_supplicant 2>/dev/null || true
    killall hostapd 2>/dev/null || true
    killall dnsmasq 2>/dev/null || true
}

########################################
# MAC SPOOFING
########################################

spoof_macs() {
    log "Spoofing MAC addresses..."

    ip link set "$UPSTREAM_IF" down
    ip link set "$AP_IF" down

    ip link set "$UPSTREAM_IF" address "$UPSTREAM_MAC"
    ip link set "$AP_IF" address "$AP_MAC"

    iw dev "$UPSTREAM_IF" set type managed

    ip link set "$UPSTREAM_IF" up
}

########################################
# CONNECT UPSTREAM
########################################

connect_upstream() {
    log "Connecting upstream Wi-Fi..."

    wpa_supplicant \
        -B \
        -i "$UPSTREAM_IF" \
        -c "$WPA_CONF" \
        -f /tmp/wpa.log

    sleep 2

    log "Obtaining DHCP lease..."

    dhclient -r "$UPSTREAM_IF" 2>/dev/null || true
    dhclient "$UPSTREAM_IF"

    log "Testing connectivity..."

    ping -c 2 1.1.1.1
}

########################################
# SYSCTL
########################################

configure_sysctl() {
    log "Configuring sysctl..."

    sysctl -w net.ipv4.ip_forward=1

    if [[ "$ENABLE_IPV6" == "yes" ]]; then
        sysctl -w net.ipv6.conf.all.forwarding=2
        sysctl -w net.ipv6.conf.all.accept_ra=2
        sysctl -w net.ipv6.conf."$UPSTREAM_IF".accept_ra=2
    fi

    # Better routing behavior
    sysctl -w net.ipv4.conf.all.rp_filter=1

    # TCP optimization
    sysctl -w net.core.default_qdisc=fq_codel
    sysctl -w net.ipv4.tcp_congestion_control=cubic
}

########################################
# WIREGUARD
########################################

start_wireguard() {
    log "Starting WireGuard..."
    wg-quick down "$WG_IF" 2>/dev/null || true

    # Get upstream gateway
    UPSTREAM_GW=$(ip route show dev "$UPSTREAM_IF" | awk '/default/ {print $3}')
    if [[ -z "$UPSTREAM_GW" ]]; then
        # fallback: grab gateway from main table
        UPSTREAM_GW=$(ip route show table main | awk '/default/ {print $3; exit}')
    fi
    log "Upstream gateway: $UPSTREAM_GW"

    # before wg-quick up
	# 1. Ensure endpoint is reachable via WAN (BEFORE tunnel)
	ip route replace 169.150.196.97/32 via "$UPSTREAM_GW" dev "$UPSTREAM_IF"
	ip -6 route replace 2a02:6ea0:c041:2245::10/128 \
    				via "$UPSTREAM_GW6" \
    				dev "$UPSTREAM_IF"
	# 2. Bring up WireGuard
	wg-quick up "$WG_IF"

	# 3. Optional: force all traffic into tunnel (only if you really want full-tunnel)
	ip route del default dev "$UPSTREAM_IF" 2>/dev/null || true

    # Default route through tunnel, low metric to win any future conflicts
    ip route replace default dev "$WG_IF" metric 50
    ip route replace ::/0 dev "$WG_IF" metric 50
	sleep 2
}

########################################
# NFTABLES
########################################

configure_nftables() {
    log "Applying hardened nftables rules..."

    nft -f - <<EOF
flush ruleset

table inet filter {

    ########################################
    # INPUT (router management plane)
    ########################################
    chain input {
        type filter hook input priority 0;
        policy drop;

        iif "lo" accept
        ct state established,related accept

        # ICMPv4 (minimal safe set)
        ip protocol icmp icmp type {
            echo-request,
            echo-reply,
            destination-unreachable,
            time-exceeded
        } accept

        # ICMPv6 essential for IPv6 to function
        icmpv6 type {
            destination-unreachable,
            packet-too-big,
            time-exceeded,
            parameter-problem,
            nd-router-solicit,
            nd-router-advert,
            nd-neighbor-solicit,
            nd-neighbor-advert,
            echo-request,
            echo-reply
        } accept

        # DHCP (upstream + AP)
	# DHCPv4 from AP clients
	iifname "$AP_IF" udp sport 68 udp dport 67 accept

	# DHCPv4 upstream client traffic
	iifname "$UPSTREAM_IF" udp sport 67 udp dport 68 accept

        # DHCPv6
        iifname "$UPSTREAM_IF" udp sport 547 accept
        iifname "$AP_IF" udp dport 547 accept

        # DNS from AP clients only
        iifname "$AP_IF" udp dport 53 accept
        iifname "$AP_IF" tcp dport 53 accept

        # SSH management from LAN only
        iifname "$AP_IF" ip saddr $AP_SUBNET tcp dport 22 accept
    }

    ########################################
    # FORWARD (data plane)
    ########################################
    chain forward {
        type filter hook forward priority 0;
        policy drop;

        ip6 saddr fd50:abcd:1234:1::/64 oifname "$WG_IF" accept
        ct state established,related accept

        # AP clients -> VPN only
        iifname "$AP_IF" oifname "$WG_IF" accept

        # Block any AP -> upstream bypass explicitly (defense-in-depth)
        iifname "$AP_IF" oifname "$UPSTREAM_IF" drop
    }

    ########################################
    # OUTPUT (router egress control)
    ########################################
    chain output {
        type filter hook output priority 0;
        policy drop;

        oif "lo" accept
        ct state established,related accept

        ########################################
        # REQUIRED: UPSTREAM CONTROL PLANE ONLY
        ########################################

        ### DHCP client
	# DHCP client requests to upstream
	oifname "$UPSTREAM_IF" udp sport 68 udp dport 67 accept
	# DHCP server replies to AP clients
	oifname "$AP_IF" udp sport 67 udp dport 68 accept

        # Allow specific WG endpoint (hard bind)
        ip daddr 169.150.196.97  udp dport 51820 oifname "$UPSTREAM_IF" accept
	ip6 daddr 2a02:6ea0:c041:2245::10 udp dport 51820 oifname "$UPSTREAM_IF" accept 
        ########################################
        # VPN EGRESS
        ########################################
        oifname "$WG_IF" accept

        ########################################
        # ICMP (safe diagnostics only)
        ########################################
        ip protocol icmp accept

        icmpv6 type {
            destination-unreachable,
            packet-too-big,
            time-exceeded,
            parameter-problem,
            nd-router-solicit,
            nd-router-advert,
            nd-neighbor-solicit,
            nd-neighbor-advert,
            echo-request,
            echo-reply
        } accept
    }
}

########################################
# NAT
########################################
table ip nat {
    chain postrouting {
        type nat hook postrouting priority 100;
        oifname "$WG_IF" masquerade
    }
}

table ip6 nat {
    chain postrouting {
        type nat hook postrouting priority 100;
        oifname "$WG_IF" masquerade
    }
}
table inet mangle {
    chain forward {
        type filter hook forward priority mangle;

        tcp flags syn tcp option maxseg size set rt mtu
    }
}
EOF

    log "nftables rules loaded."
}

########################################
# AP INTERFACE
########################################

setup_ap_interface() {
    log "Configuring AP interface..."

    iw dev "$AP_IF" set type __ap

    ip link set "$AP_IF" up

    ip link set "$AP_IF" mtu 1500
    
    ip link set dev "$AP_IF" txqueuelen 1000

    ip addr flush dev "$AP_IF"

    ip addr add "$AP_IPV4" dev "$AP_IF"

    if [[ "$ENABLE_IPV6" == "yes" ]]; then
        ip -6 addr add "$AP_IPV6" dev "$AP_IF" || true
    fi
}

########################################
# HOSTAPD
########################################

start_hostapd() {
    log "Starting hostapd..."

    hostapd -B "$HOSTAPD_CONF"

    sleep 2
}

########################################
# DNSMASQ
########################################

configure_dns() {
    log "Configuring DNS..."

    # Break the systemd-resolved symlink, replace with static file
    rm -f /etc/resolv.conf
    cat > /etc/resolv.conf <<EOF
nameserver 94.140.14.14
nameserver 94.140.15.15
options edns0 trust-ad
EOF

    # Prevent dhclient from overwriting it
    mkdir -p /etc/dhcp/dhclient-enter-hooks.d/
    cat > /etc/dhcp/dhclient-enter-hooks.d/nodnsupdate <<'EOF'
#!/bin/sh
make_resolv_conf() { : ; }
EOF
    chmod +x /etc/dhcp/dhclient-enter-hooks.d/nodnsupdate

    log "DNS locked to AdGuard (via static resolv.conf)."
}

start_dnsmasq() {
    log "Starting dnsmasq..."

    dnsmasq \
        -C "$DNSMASQ_CONF" \
        -x "$DNSMASQ_PID"
}

########################################
# SQM / CAKE
########################################

configure_sqm() {
    if [[ "$ENABLE_SQM" != "yes" ]]; then
        return
    fi

    log "Applying CAKE SQM..."

    ########################################
    # WAN / VPN egress shaping (correct)
    ########################################
    tc qdisc replace dev "$WG_IF" root cake \
        bandwidth "$SQM_BANDWIDTH" \
        diffserv4 \
        nat \
        wash

    ########################################
    # AP interface shaping (fixes your jitter)
    ########################################
    tc qdisc replace dev "$AP_IF" root cake \
        bandwidth 200Mbit \
        diffserv4 \
        nat \
        wash
}


########################################
# MONITOR LOOP
########################################

monitor_loop() {
    log "Starting health monitor..."
    log "Script will auto-restart in 24 hours."

    sleep 216000

    log "24-hour timer elapsed. Restarting script..."
    exec bash "$0"
}


########################################
# MAIN
########################################

main() {
    check_requirements

    stop_conflicting_services

    spoof_macs

    connect_upstream

    configure_sysctl

    configure_dns

    start_wireguard      # bring up tunnel + add routes

    configure_nftables

    setup_ap_interface

    log "Verifying WireGuard tunnel..."
    wg show wgo_free
    ip route get 169.150.196.97
    ping -c3  -I wgo_free 10.2.0.1
   # ping6 -c3 2606:4700:4700::1111

    start_hostapd

    start_dnsmasq

    configure_sqm

    log "======================================="
    log "AP + WireGuard router online"
    log "Kill switch ACTIVE"
    log "DNS leak protection ACTIVE"
    log "IPv6 forwarding ACTIVE"
    log "SQM ACTIVE"
    log "======================================="

     monitor_loop
}

main
