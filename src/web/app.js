
// ==================================================
// Easy Router frontend
// ==================================================
//
// This frontend talks to the existing FastAPI API:
//
//     GET /api/interfaces
//     GET /api/config
//     PUT /api/config
//
// Hostapd configuration is represented by the
// existing "wifi" section of /api/config.
//
// ==================================================


// ==================================================
// GLOBAL STATE
// ==================================================

let currentConfig = null;


// ==================================================
// DOM
// ==================================================

const page =
    document.getElementById("page");

const pageTitle =
    document.getElementById("page-title");

const pageDescription =
    document.getElementById("page-description");

const navigationButtons =
    document.querySelectorAll(".nav-button");


// ==================================================
// API
// ==================================================

async function getInterfaces() {

    const response =
        await fetch("/api/interfaces");

    if (!response.ok) {
        throw new Error(
            `Failed to load interfaces (${response.status})`
        );
    }

    return response.json();
}


async function getHostapdConfig() {

    const response =
        await fetch("/api/hostapd");

    if (!response.ok) {
        throw new Error(
            `Failed to load configuration (${response.status})`
        );
    }

    return response.json();
}


async function saveConfig(config) {

    const response =
        await fetch(
            "/api/config",
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(config)
            }
        );


    if (!response.ok) {

        let message =
            `Failed to save configuration (${response.status})`;

        try {

            const error =
                await response.json();

            if (error.detail) {
                message = error.detail;
            }

        } catch {
            // Response wasn't JSON.
        }

        throw new Error(message);
    }


    return response.json();
}


// ==================================================
// PAGE HEADER
// ==================================================

function setPageHeader(
    title,
    description
) {

    pageTitle.textContent =
        title;

    pageDescription.textContent =
        description;
}


// ==================================================
// NAVIGATION
// ==================================================

function setActiveNavigation(
    pageName
) {

    navigationButtons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.page === pageName
            );

        }
    );
}

function setupNavigation_debug() {

    navigationButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const pageName =
                        button.dataset.page;

                    console.log(
                        "NAVIGATION CLICK:",
                        pageName
                    );

                    setActiveNavigation(
                        pageName
                    );

                    switch (pageName) {

                        case "available":
                            showAvailablePage();
                            break;

                        case "hostapd":
                            showHostapdPage();
                            break;

                        case "dnsmasq":
                            console.log(
                                "CALLING showDnsmasqPage()"
                            );

                            showDnsmasqPage();
                            break;

                    }

                }
            );

        }
    );
}

function setupNavigation() {

    navigationButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const pageName =
                        button.dataset.page;

                    setActiveNavigation(
                        pageName
                    );


                    switch (pageName) {

                        case "available":
                            showAvailablePage();
                            break;

                        case "hostapd":
                            showHostapdPage();
                            break;

                        case "dnsmasq":
                            showDnsmasqPage();
                            break;

                    }

                }
            );

        }
    );
}


// ==================================================
// AVAILABLE / NETWORK PAGE
// ==================================================

async function showAvailablePage() {

    setPageHeader(
        "Network",
        "Network interfaces available on this machine."
    );


    page.innerHTML = `
        <section class="card">

            <h2 class="card-title">
                Available network interfaces
            </h2>

            <p class="card-description">
                These interfaces were discovered from
                the Linux system.
            </p>

            <div id="interfaces">
                <p class="loading">
                    Loading interfaces...
                </p>
            </div>

        </section>
    `;


    const container =
        document.getElementById(
            "interfaces"
        );


    try {

        const interfaces =
            await getInterfaces();


        if (!interfaces.length) {

            container.innerHTML = `
                <p class="empty">
                    No network interfaces were found.
                </p>
            `;

            return;
        }


        const list =
            document.createElement(
                "div"
            );

        list.className =
            "interface-list";


        for (
            const iface
            of interfaces
        ) {

            list.appendChild(
                createInterfaceCard(iface)
            );

        }


        container.innerHTML = "";

        container.appendChild(list);


    } catch (error) {

        container.innerHTML = `
            <div class="error">
                ${escapeHtml(error.message)}
            </div>
        `;

        console.error(error);
    }
}


// ==================================================
// INTERFACE CARD
// ==================================================

function createInterfaceCard(
    iface
) {

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "interface-card";


    let statusClass =
        "status-other";


    if (iface.state === "up") {
        statusClass =
            "status-up";
    }

    if (iface.state === "down") {
        statusClass =
            "status-down";
    }


    card.innerHTML = `
        <div class="interface-name">
            ${escapeHtml(iface.name)}
        </div>

        <div class="interface-row">
            <span class="interface-label">
                Type
            </span>

            <span class="interface-value">
                ${escapeHtml(
                    iface.interface_type ?? "unknown"
                )}
            </span>
        </div>


        <div class="interface-row">
            <span class="interface-label">
                State
            </span>

            <span class="interface-value">
                <span class="status ${statusClass}">
                    ${escapeHtml(
                        iface.state ?? "unknown"
                    )}
                </span>
            </span>
        </div>


        <div class="interface-row">
            <span class="interface-label">
                Physical
            </span>

            <span class="interface-value">
                ${iface.is_physical ? "Yes" : "No"}
            </span>
        </div>


        <div class="interface-row">
            <span class="interface-label">
                Driver
            </span>

            <span class="interface-value">
                ${escapeHtml(
                    iface.driver ?? "None"
                )}
            </span>
        </div>


        <div class="interface-row">
            <span class="interface-label">
                MAC
            </span>

            <span class="interface-value">
                ${escapeHtml(
                    iface.mac_address ?? "Unknown"
                )}
            </span>
        </div>
    `;


    return card;
}


// ==================================================
// HOSTAPD PAGE
// ==================================================

async function showHostapdPage() {

    setPageHeader(
        "Hostapd",
        "Configure the wireless access point."
    );


    page.innerHTML = `
        <section class="card">

            <h2 class="card-title">
                Wi-Fi access point
            </h2>

            <p class="card-description">
                Configure the interface, SSID,
                security and wireless channel
                used by hostapd.
            </p>


            <form id="hostapd-form">

                <div class="form-grid">


                    <!-- Interface -->

                    <div class="form-group">

                        <label for="wifi-interface">
                            Wi-Fi interface
                        </label>

                        <select
                            id="wifi-interface"
                            required
                        >
                            <option value="">
                                Loading interfaces...
                            </option>
                        </select>

                        <div class="form-help">
                            Only Wi-Fi interfaces discovered
                            by the backend are shown.
                        </div>

                    </div>


                    <!-- SSID -->

                    <div class="form-group">

                        <label for="wifi-ssid">
                            SSID
                        </label>

                        <input
                            id="wifi-ssid"
                            type="text"
                            maxlength="32"
                            required
                            placeholder="AP nam"
                        >

                        <div class="form-help">
                            The name visible to Wi-Fi clients.
                        </div>

                    </div>


                    <!-- Password -->

                    <div class="form-group">

                        <label for="wifi-password">
                            Password
                        </label>

                        <input
                            id="wifi-password"
                            type="password"
                            minlength="8"
                            placeholder="Enter Wi-Fi password"
                        >

                        <div class="form-help">
                            Leave empty if your backend
                            intentionally permits an empty password.
                        </div>

                    </div>


                    <!-- Country -->

                    <div class="form-group">

                        <label for="wifi-country">
                            Country
                        </label>

                        <input
                            id="wifi-country"
                            type="text"
                            maxlength="2"
                            required
                            placeholder="NL"
                        >

                        <div class="form-help">
                            Two-letter country code.
                        </div>

                    </div>


                    <!-- Channel -->

                    <div class="form-group">

                        <label for="wifi-channel">
                            Channel
                        </label>

                        <input
                            id="wifi-channel"
                            type="number"
                            min="1"
                            max="196"
                            required
                        >

                        <div class="form-help">
                            The channel used by the access point.
                        </div>

                    </div>


                </div>


                <div class="form-actions">

                    <button
                        type="submit"
                        class="button"
                        id="save-hostapd"
                    >
                        Apply configuration
                    </button>

                    <button
                        type="button"
                        class="button button-secondary"
                        id="reload-hostapd"
                    >
                        Reload
                    </button>

                </div>


                <div
                    id="hostapd-message"
                    class="message"
                ></div>

            </form>

        </section>
    `;


    try {

        /*
         * Load both pieces of information:
         *
         *   /api/config
         *   /api/interfaces
         *
         * The config tells us what the user currently
         * has configured.
         *
         * The interfaces endpoint tells us what
         * hardware actually exists.
         */

        const [
            hostapdConfig,
            interfaces
        ] = await Promise.all([
            getHostapdConfig(),
            getInterfaces()
        ]);


        currentConfig =
            hostapdConfig;


        populateHostapdForm(
            hostapdConfig,
            interfaces
        );


    } catch (error) {

        showMessage(
            "hostapd-message",
            error.message,
            "error"
        );

        console.error(error);
    }


    /*
     * Form submission
     */

    document
        .getElementById("hostapd-form")
        .addEventListener(
            "submit",
            handleHostapdSubmit
        );


    /*
     * Reload button
     */

    document
        .getElementById("reload-hostapd")
        .addEventListener(
            "click",
            () => showHostapdPage()
        );
}


// ==================================================
// POPULATE HOSTAPD FORM
// ==================================================

function populateHostapdForm(
    wifi,
    interfaces
) {


    const interfaceSelect =
        document.getElementById(
            "wifi-interface"
        );


    /*
     * Only show actual Wi-Fi interfaces.
     */

    const wifiInterfaces =
        interfaces.filter(
            iface =>
                iface.interface_type === "wifi"
        );


    interfaceSelect.innerHTML = "";


    if (!wifiInterfaces.length) {

        interfaceSelect.innerHTML = `
            <option value="">
                No Wi-Fi interfaces found
            </option>
        `;

    } else {

        for (
            const iface
            of wifiInterfaces
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                iface.name;


            option.textContent =
                `${iface.name} — ${
                    iface.driver ?? "unknown driver"
                }`;


            if (
                iface.name ===
                wifi.interface
            ) {

                option.selected =
                    true;
            }


            interfaceSelect.appendChild(
                option
            );
        }
    }


    /*
     * Existing configuration.
     */

    document.getElementById(
        "wifi-ssid"
    ).value =
        wifi.ssid ?? "";


    document.getElementById(
        "wifi-country"
    ).value =
        wifi.country ?? "";


    document.getElementById(
        "wifi-channel"
    ).value =
        wifi.channel ?? 6;


    /*
     * We intentionally do not put the password
     * into the password input.
     *
     * The backend may choose not to return it.
     */

    document.getElementById(
        "wifi-password"
    ).value = "";
}


// ==================================================
// SAVE HOSTAPD CONFIGURATION
// ==================================================

async function handleHostapdSubmit(
    event
) {

    event.preventDefault();


    const saveButton =
        document.getElementById(
            "save-hostapd"
        );


    const passwordInput =
        document.getElementById(
            "wifi-password"
        );


    /*
     * Read the form.
     */

    const wifi = {

        enabled: true,

        interface:
            document.getElementById(
                "wifi-interface"
            ).value,

        ssid:
            document.getElementById(
                "wifi-ssid"
            ).value.trim(),

        password:
            passwordInput.value,

        country:
            document.getElementById(
                "wifi-country"
            ).value.trim().toUpperCase(),

        channel:
            Number(
                document.getElementById(
                    "wifi-channel"
                ).value
            )
    };


    /*
     * Basic browser-side validation.
     */

    if (!wifi.interface) {

        showMessage(
            "hostapd-message",
            "Please select a Wi-Fi interface.",
            "error"
        );

        return;
    }


    if (!wifi.ssid) {

        showMessage(
            "hostapd-message",
            "Please enter an SSID.",
            "error"
        );

        return;
    }


    if (
        !wifi.country ||
        wifi.country.length !== 2
    ) {

        showMessage(
            "hostapd-message",
            "Country must be a two-letter code.",
            "error"
        );

        return;
    }


    if (
        !Number.isInteger(wifi.channel) ||
        wifi.channel < 1
    ) {

        showMessage(
            "hostapd-message",
            "Please enter a valid channel.",
            "error"
        );

        return;
    }


    /*
     * Disable button while saving.
     */

    saveButton.disabled =
        true;

    saveButton.textContent =
        "Applying...";


    showMessage(
        "hostapd-message",
        "Sending configuration to the backend...",
        "info"
    );


    try {

        /*
         * IMPORTANT:
         *
         * We don't send shell commands.
         *
         * We send structured configuration
         * to FastAPI.
         *
         * The backend decides what Linux
         * operations need to happen.
         */


        /*
         * Preserve the other configuration
         * sections returned by /api/config.
         *
         * For example:
         *
         *     wifi
         *     dhcp
         *     wireguard
         *
         * We only replace "wifi".
         */

        const newConfig = {

            ...currentConfig,

            wifi: wifi
        };


        const result =
            await saveConfig(
                newConfig
            );


        /*
         * Keep our local copy synchronized.
         */

        currentConfig =
            result.config ??
            newConfig;


        showMessage(
            "hostapd-message",
            result.message ??
                "Configuration applied successfully.",
            "success"
        );


    } catch (error) {

        showMessage(
            "hostapd-message",
            error.message,
            "error"
        );

        console.error(error);

    } finally {

        saveButton.disabled =
            false;

        saveButton.textContent =
            "Apply configuration";
    }
}


// ==================================================
// DNSMASQ PAGE
// ==================================================

async function showDnsmasqPage() {

    setPageHeader(
        "Dnsmasq",
        "Configure DNS & DHCP"
    );


    page.innerHTML = `
        <section class="card">

            <h2 class="card-title">
                DNS & DHCP
            </h2>

            <p class="card-description">
                Configure DNS forwarding, caching,
                blocklists, DHCP and IPv6 support.
            </p>


            <form id="dnsmasq-form">

                <div class="form-grid">


                    <!-- ========================================== -->
                    <!-- DNS INTERFACE                              -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dnsmasq-interface">
                            DNS interface
                        </label>

                        <select
                            id="dnsmasq-interface"
                            required
                        >
                            <option value="">
                                Loading interfaces...
                            </option>
                        </select>

                        <div class="form-help">
                            Interface on which dnsmasq
                            listens for DNS requests.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DNS DOMAIN                                 -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dnsmasq-domain">
                            Local domain
                        </label>

                        <input
                            id="dnsmasq-domain"
                            type="text"
                            placeholder="home"
                        >

                        <div class="form-help">
                            Local DNS domain used for
                            DHCP hostnames and local names.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- CACHE SIZE                                 -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dnsmasq-cache-size">
                            DNS cache size
                        </label>

                        <input
                            id="dnsmasq-cache-size"
                            type="number"
                            min="0"
                            required
                        >

                        <div class="form-help">
                            Maximum number of DNS records
                            cached by dnsmasq.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- NEGATIVE TTL                               -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dnsmasq-negative-ttl">
                            Negative cache TTL
                        </label>

                        <input
                            id="dnsmasq-negative-ttl"
                            type="number"
                            min="0"
                            required
                        >

                        <div class="form-help">
                            How long failed DNS lookups
                            are cached, in seconds.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DNS FORWARD MAX                            -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dnsmasq-forward-max">
                            Maximum DNS forwards
                        </label>

                        <input
                            id="dnsmasq-forward-max"
                            type="number"
                            min="1"
                            required
                        >

                        <div class="form-help">
                            Maximum number of simultaneous
                            upstream DNS queries.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- UPSTREAM DNS                               -->
                    <!-- ========================================== -->

                    <div class="form-group form-group-wide">

                        <label for="dnsmasq-upstream">
                            Upstream DNS servers
                        </label>

                        <textarea
                            id="dnsmasq-upstream"
                            rows="5"
                            placeholder="1.1.1.1&#10;9.9.9.9"
                        ></textarea>

                        <div class="form-help">
                            One server per line. You can bind
                            a server to an interface using
                            <code>IP@interface</code>.
                            For example:
                            <code>1.1.1.1@wg0</code>.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- NO RESOLV                                  -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dnsmasq-no-resolv"
                                type="checkbox"
                            >

                            <span>
                                Ignore system DNS configuration
                            </span>

                        </label>

                        <div class="form-help">
                            Prevent dnsmasq from using DNS
                            servers from resolv.conf.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- EXPAND HOSTS                               -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dnsmasq-expand-hosts"
                                type="checkbox"
                            >

                            <span>
                                Expand local hostnames
                            </span>

                        </label>

                        <div class="form-help">
                            Append the configured local domain
                            to short hostnames.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DNS REBIND                                 -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dnsmasq-stop-rebind"
                                type="checkbox"
                            >

                            <span>
                                Block DNS rebinding
                            </span>

                        </label>

                        <div class="form-help">
                            Protect clients from DNS rebinding
                            attacks.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- LOCALHOST REBIND                           -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dnsmasq-localhost-rebind"
                                type="checkbox"
                            >

                            <span>
                                Allow localhost rebinds
                            </span>

                        </label>

                        <div class="form-help">
                            Allow DNS responses pointing to
                            localhost addresses.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- IPv6 RA                                    -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dnsmasq-ipv6-ra"
                                type="checkbox"
                            >

                            <span>
                                Enable IPv6 Router Advertisements
                            </span>

                        </label>

                        <div class="form-help">
                            Advertise IPv6 configuration to
                            clients on the LAN.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- BLOCKLISTS                                 -->
                    <!-- ========================================== -->

                    <div class="form-group form-group-wide">

                        <label for="dnsmasq-blocklists">
                            Blocklist files
                        </label>

                        <textarea
                            id="dnsmasq-blocklists"
                            rows="5"
                            placeholder="/etc/dnsmasq.blocklists/stevenblack.hosts"
                        ></textarea>

                        <div class="form-help">
                            One hosts file per line.
                            Domains in these files will be
                            blocked by dnsmasq.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- LOGGING                                    -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dnsmasq-log-queries"
                                type="checkbox"
                            >

                            <span>
                                Log DNS queries
                            </span>

                        </label>

                    </div>


                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dnsmasq-log-dhcp"
                                type="checkbox"
                            >

                            <span>
                                Log DHCP activity
                            </span>

                        </label>

                    </div>


                    <div class="form-group form-group-wide">

                        <label for="dnsmasq-log-destination">
                            Log destination
                        </label>

                        <input
                            id="dnsmasq-log-destination"
                            type="text"
                            placeholder="/var/log/dnsmasq.log"
                        >

                        <div class="form-help">
                            File or system logging destination
                            used by dnsmasq.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP ENABLED                               -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dhcp-enabled"
                                type="checkbox"
                            >

                            <span>
                                Enable DHCP
                            </span>

                        </label>

                        <div class="form-help">
                            Enable DHCPv4 address allocation.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP INTERFACE                             -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-interface">
                            DHCP interface
                        </label>

                        <select
                            id="dhcp-interface"
                        >
                            <option value="">
                                Loading interfaces...
                            </option>
                        </select>

                        <div class="form-help">
                            Interface on which DHCP requests
                            are served.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP NETWORK                               -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-network">
                            DHCP network
                        </label>

                        <input
                            id="dhcp-network"
                            type="text"
                            required
                            placeholder="192.168.50.0/24"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP GATEWAY                               -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-gateway">
                            Gateway
                        </label>

                        <input
                            id="dhcp-gateway"
                            type="text"
                            required
                            placeholder="192.168.50.1"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP RANGE START                           -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-range-start">
                            DHCP range start
                        </label>

                        <input
                            id="dhcp-range-start"
                            type="text"
                            required
                            placeholder="192.168.50.10"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP RANGE END                             -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-range-end">
                            DHCP range end
                        </label>

                        <input
                            id="dhcp-range-end"
                            type="text"
                            required
                            placeholder="192.168.50.100"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- LEASE TIME                                 -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-lease-time">
                            Lease time
                        </label>

                        <input
                            id="dhcp-lease-time"
                            type="text"
                            required
                            placeholder="12h"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP DNS SERVERS                           -->
                    <!-- ========================================== -->

                    <div class="form-group form-group-wide">

                        <label for="dhcp-dns-servers">
                            DHCP DNS servers
                        </label>

                        <textarea
                            id="dhcp-dns-servers"
                            rows="3"
                            placeholder="192.168.50.1"
                        ></textarea>

                        <div class="form-help">
                            One IPv4 DNS server per line.
                            These are advertised to DHCP clients.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCP AUTHORITATIVE                         -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dhcp-authoritative"
                                type="checkbox"
                            >

                            <span>
                                Authoritative DHCP server
                            </span>

                        </label>

                        <div class="form-help">
                            Enable if dnsmasq is the only
                            DHCP server on this network.
                        </div>

                    </div>


                    <!-- ========================================== -->
                    <!-- DHCPv6                                    -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label class="checkbox-label">

                            <input
                                id="dhcp-ipv6-enabled"
                                type="checkbox"
                            >

                            <span>
                                Enable DHCPv6
                            </span>

                        </label>

                    </div>


                    <!-- ========================================== -->
                    <!-- IPv6 RANGE START                           -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-ipv6-range-start">
                            IPv6 range start
                        </label>

                        <input
                            id="dhcp-ipv6-range-start"
                            type="text"
                            placeholder="::100"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- IPv6 RANGE END                             -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-ipv6-range-end">
                            IPv6 range end
                        </label>

                        <input
                            id="dhcp-ipv6-range-end"
                            type="text"
                            placeholder="::1ff"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- IPv6 PREFIX LENGTH                         -->
                    <!-- ========================================== -->

                    <div class="form-group">

                        <label for="dhcp-ipv6-prefix-length">
                            IPv6 prefix length
                        </label>

                        <input
                            id="dhcp-ipv6-prefix-length"
                            type="number"
                            min="0"
                            max="128"
                            value="64"
                        >

                    </div>


                    <!-- ========================================== -->
                    <!-- IPv6 DNS SERVERS                           -->
                    <!-- ========================================== -->

                    <div class="form-group form-group-wide">

                        <label for="dhcp-ipv6-dns">
                            IPv6 DNS servers
                        </label>

                        <textarea
                            id="dhcp-ipv6-dns"
                            rows="3"
                            placeholder="fd50:abcd:1234:1::1"
                        ></textarea>

                        <div class="form-help">
                            One IPv6 DNS server per line.
                        </div>

                    </div>


                </div>


                <!-- ============================================== -->
                <!-- ACTIONS                                        -->
                <!-- ============================================== -->

                <div class="form-actions">

                    <button
                        type="submit"
                        class="button"
                        id="save-dnsmasq"
                    >
                        Apply configuration
                    </button>

                    <button
                        type="button"
                        class="button button-secondary"
                        id="reload-dnsmasq"
                    >
                        Reload
                    </button>

                </div>


                <div
                    id="dnsmasq-message"
                    class="message"
                ></div>

            </form>

        </section>
    `;


    try {

        /*
         * Load the dnsmasq configuration and
         * available network interfaces.
         */

        const [
            dnsmasqConfig,
            interfaces
        ] = await Promise.all([
            getDnsmasqConfig(),
            getInterfaces()
        ]);


        currentDnsmasqConfig =
            dnsmasqConfig;


        populateDnsmasqForm(
            dnsmasqConfig,
            interfaces
        );


    } catch (error) {

        showMessage(
            "dnsmasq-message",
            error.message,
            "error"
        );

        console.error(error);
    }


    /*
     * Form submission
     */

    document
        .getElementById("dnsmasq-form")
        .addEventListener(
            "submit",
            handleDnsmasqSubmit
        );


    /*
     * Reload button
     */

    document
        .getElementById("reload-dnsmasq")
        .addEventListener(
            "click",
            () => showDnsmasqPage()
        );
}


// ==================================================
// POPULATE DNSMASQ FORM
// ==================================================

function populateDnsmasqForm(
    dnsmasqConfig,
    interfaces
) {

    const dnsmasq =
        dnsmasqConfig ?? {};

    const dhcp =
        dnsmasq.dhcp_config ?? {};


    // --------------------------------------------------
    // Interface lists
    // --------------------------------------------------

    const dnsInterfaceSelect =
        document.getElementById(
            "dnsmasq-interface"
        );

    const dhcpInterfaceSelect =
        document.getElementById(
            "dhcp-interface"
        );


    /*
     * Use all interfaces for dnsmasq.
     *
     * DHCP can technically run on more than just
     * Wi-Fi interfaces, so don't filter this list
     * to Wi-Fi only.
     */

    const availableInterfaces =
        interfaces.filter(
            iface =>
                iface.name
        );


    function populateInterfaceSelect(
        select,
        selectedValue
    ) {

        select.innerHTML = "";


        /*
         * Allow an empty dnsmasq interface because
         * the backend treats it as "don't explicitly
         * specify interface".
         */

        const autoOption =
            document.createElement(
                "option"
            );

        autoOption.value = "";
        autoOption.textContent =
            "Automatic";

        if (!selectedValue) {
            autoOption.selected = true;
        }

        select.appendChild(
            autoOption
        );


        for (
            const iface
            of availableInterfaces
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                iface.name;


            option.textContent =
                `${iface.name} — ${
                    iface.driver ?? "unknown"
                }`;


            if (
                iface.name ===
                selectedValue
            ) {

                option.selected =
                    true;
            }


            select.appendChild(
                option
            );
        }
    }


    populateInterfaceSelect(
        dnsInterfaceSelect,
        dnsmasq.interface ?? ""
    );


    populateInterfaceSelect(
        dhcpInterfaceSelect,
        dhcp.interface ?? ""
    );


    // --------------------------------------------------
    // DNS
    // --------------------------------------------------

    document.getElementById(
        "dnsmasq-domain"
    ).value =
        dnsmasq.domain ?? "";


    document.getElementById(
        "dnsmasq-cache-size"
    ).value =
        dnsmasq.cache_size ?? 10000;


    document.getElementById(
        "dnsmasq-negative-ttl"
    ).value =
        dnsmasq.negative_ttl ?? 3600;


    document.getElementById(
        "dnsmasq-forward-max"
    ).value =
        dnsmasq.dns_forward_max ?? 150;


    document.getElementById(
        "dnsmasq-upstream"
    ).value =
        (dnsmasq.upstream_servers ?? [])
            .join("\n");


    document.getElementById(
        "dnsmasq-no-resolv"
    ).checked =
        dnsmasq.no_resolv ?? true;


    document.getElementById(
        "dnsmasq-expand-hosts"
    ).checked =
        dnsmasq.expand_hosts ?? true;


    document.getElementById(
        "dnsmasq-stop-rebind"
    ).checked =
        dnsmasq.stop_dns_rebind ?? true;


    document.getElementById(
        "dnsmasq-localhost-rebind"
    ).checked =
        dnsmasq.rebind_localhost_ok ?? true;


    document.getElementById(
        "dnsmasq-ipv6-ra"
    ).checked =
        dnsmasq.ipv6_ads ?? false;


    // --------------------------------------------------
    // Blocklists
    // --------------------------------------------------

    document.getElementById(
        "dnsmasq-blocklists"
    ).value =
        (dnsmasq.blocklist_files ?? [])
            .join("\n");


    // --------------------------------------------------
    // Logging
    // --------------------------------------------------

    document.getElementById(
        "dnsmasq-log-queries"
    ).checked =
        dnsmasq.log_queries ?? false;


    document.getElementById(
        "dnsmasq-log-dhcp"
    ).checked =
        dnsmasq.log_dhcp ?? false;


    document.getElementById(
        "dnsmasq-log-destination"
    ).value =
        dnsmasq.log_destination ??
        "/var/log/dnsmasq.log";


    // --------------------------------------------------
    // DHCP
    // --------------------------------------------------

    document.getElementById(
        "dhcp-enabled"
    ).checked =
        dhcp.enabled ?? false;


    document.getElementById(
        "dhcp-network"
    ).value =
        dhcp.network ??
        "192.168.10.0/24";


    document.getElementById(
        "dhcp-gateway"
    ).value =
        dhcp.gateway ??
        "192.168.10.1";


    document.getElementById(
        "dhcp-range-start"
    ).value =
        dhcp.range_start ??
        "192.168.10.100";


    document.getElementById(
        "dhcp-range-end"
    ).value =
        dhcp.range_end ??
        "192.168.10.200";


    document.getElementById(
        "dhcp-lease-time"
    ).value =
        dhcp.lease_time ??
        "12h";


    document.getElementById(
        "dhcp-dns-servers"
    ).value =
        (dhcp.dns_servers ?? [])
            .join("\n");


    document.getElementById(
        "dhcp-authoritative"
    ).checked =
        dhcp.authoritative ?? true;


    // --------------------------------------------------
    // DHCPv6
    // --------------------------------------------------

    document.getElementById(
        "dhcp-ipv6-enabled"
    ).checked =
        dhcp.ipv6_enabled ?? false;


    document.getElementById(
        "dhcp-ipv6-range-start"
    ).value =
        dhcp.ipv6_range_start ??
        "::100";


    document.getElementById(
        "dhcp-ipv6-range-end"
    ).value =
        dhcp.ipv6_range_end ??
        "::1ff";


    document.getElementById(
        "dhcp-ipv6-prefix-length"
    ).value =
        dhcp.ipv6_prefix_length ??
        64;


    document.getElementById(
        "dhcp-ipv6-dns"
    ).value =
        (dhcp.ipv6_dns_servers ?? [])
            .join("\n");
}


// ==================================================
// SAVE DNSMASQ CONFIGURATION
// ==================================================

async function handleDnsmasqSubmit(
    event
) {

    event.preventDefault();


    const saveButton =
        document.getElementById(
            "save-dnsmasq"
        );


    /*
     * Helper for textarea fields containing
     * one value per line.
     */

    function linesFrom(
        id
    ) {

        return document
            .getElementById(id)
            .value
            .split("\n")
            .map(value => value.trim())
            .filter(Boolean);
    }


    // --------------------------------------------------
    // Build DNS configuration
    // --------------------------------------------------

    const dnsmasq = {

        enabled: true,

        interface:
            document.getElementById(
                "dnsmasq-interface"
            ).value,

        except_interfaces:
            currentDnsmasqConfig
                ?.except_interfaces ??
            ["lo"],

        ipv6_ads:
            document.getElementById(
                "dnsmasq-ipv6-ra"
            ).checked,

        no_resolv:
            document.getElementById(
                "dnsmasq-no-resolv"
            ).checked,

        upstream_servers:
            linesFrom(
                "dnsmasq-upstream"
            ),

        cache_size:
            Number(
                document.getElementById(
                    "dnsmasq-cache-size"
                ).value
            ),

        negative_ttl:
            Number(
                document.getElementById(
                    "dnsmasq-negative-ttl"
                ).value
            ),

        dns_forward_max:
            Number(
                document.getElementById(
                    "dnsmasq-forward-max"
                ).value
            ),

        stop_dns_rebind:
            document.getElementById(
                "dnsmasq-stop-rebind"
            ).checked,

        rebind_localhost_ok:
            document.getElementById(
                "dnsmasq-localhost-rebind"
            ).checked,

        domain:
            document.getElementById(
                "dnsmasq-domain"
            ).value.trim(),

        expand_hosts:
            document.getElementById(
                "dnsmasq-expand-hosts"
            ).checked,

        blocklist_files:
            linesFrom(
                "dnsmasq-blocklists"
            ),

        log_queries:
            document.getElementById(
                "dnsmasq-log-queries"
            ).checked,

        log_dhcp:
            document.getElementById(
                "dnsmasq-log-dhcp"
            ).checked,

        log_destination:
            document.getElementById(
                "dnsmasq-log-destination"
            ).value.trim(),


        // --------------------------------------------------
        // DHCP
        // --------------------------------------------------

        dhcp_config: {

            enabled:
                document.getElementById(
                    "dhcp-enabled"
                ).checked,

            interface:
                document.getElementById(
                    "dhcp-interface"
                ).value,

            network:
                document.getElementById(
                    "dhcp-network"
                ).value.trim(),

            gateway:
                document.getElementById(
                    "dhcp-gateway"
                ).value.trim(),

            range_start:
                document.getElementById(
                    "dhcp-range-start"
                ).value.trim(),

            range_end:
                document.getElementById(
                    "dhcp-range-end"
                ).value.trim(),

            lease_time:
                document.getElementById(
                    "dhcp-lease-time"
                ).value.trim(),

            dns_servers:
                linesFrom(
                    "dhcp-dns-servers"
                ),

            domain:
                document.getElementById(
                    "dnsmasq-domain"
                ).value.trim(),

            authoritative:
                document.getElementById(
                    "dhcp-authoritative"
                ).checked,

            ipv6_enabled:
                document.getElementById(
                    "dhcp-ipv6-enabled"
                ).checked,

            ipv6_ra:
                document.getElementById(
                    "dnsmasq-ipv6-ra"
                ).checked,

            ipv6_range_start:
                document.getElementById(
                    "dhcp-ipv6-range-start"
                ).value.trim(),

            ipv6_range_end:
                document.getElementById(
                    "dhcp-ipv6-range-end"
                ).value.trim(),

            ipv6_prefix_length:
                Number(
                    document.getElementById(
                        "dhcp-ipv6-prefix-length"
                    ).value
                ),

            ipv6_dns_servers:
                linesFrom(
                    "dhcp-ipv6-dns"
                ),
        },
    };


    // --------------------------------------------------
    // Browser-side validation
    // --------------------------------------------------

    if (
        dnsmasq.cache_size < 0
    ) {

        showMessage(
            "dnsmasq-message",
            "DNS cache size cannot be negative.",
            "error"
        );

        return;
    }


    if (
        dnsmasq.negative_ttl < 0
    ) {

        showMessage(
            "dnsmasq-message",
            "Negative TTL cannot be negative.",
            "error"
        );

        return;
    }


    if (
        dnsmasq.dns_forward_max < 1
    ) {

        showMessage(
            "dnsmasq-message",
            "Maximum DNS forwards must be greater than zero.",
            "error"
        );

        return;
    }


    if (
        !dnsmasq.domain
    ) {

        showMessage(
            "dnsmasq-message",
            "Please enter a local DNS domain.",
            "error"
        );

        return;
    }


    // --------------------------------------------------
    // DHCP validation
    // --------------------------------------------------

    if (
        dnsmasq.dhcp_config.enabled &&
        !dnsmasq.dhcp_config.interface
    ) {

        showMessage(
            "dnsmasq-message",
            "Please select a DHCP interface.",
            "error"
        );

        return;
    }


    if (
        dnsmasq.dhcp_config.enabled &&
        !dnsmasq.dhcp_config.network
    ) {

        showMessage(
            "dnsmasq-message",
            "Please enter the DHCP network.",
            "error"
        );

        return;
    }


    if (
        dnsmasq.dhcp_config.enabled &&
        !dnsmasq.dhcp_config.gateway
    ) {

        showMessage(
            "dnsmasq-message",
            "Please enter the DHCP gateway.",
            "error"
        );

        return;
    }


    if (
        dnsmasq.dhcp_config.enabled &&
        (
            !dnsmasq.dhcp_config.range_start ||
            !dnsmasq.dhcp_config.range_end
        )
    ) {

        showMessage(
            "dnsmasq-message",
            "Please enter both DHCP range addresses.",
            "error"
        );

        return;
    }


    // --------------------------------------------------
    // Disable button while saving
    // --------------------------------------------------

    saveButton.disabled =
        true;

    saveButton.textContent =
        "Applying...";


    showMessage(
        "dnsmasq-message",
        "Testing and applying dnsmasq configuration...",
        "info"
    );


    try {

        /*
         * The dnsmasq API expects a DnsmasqConfig
         * directly.
         *
         * Do NOT wrap this in:
         *
         *     { config: dnsmasq }
         *
         * because the FastAPI endpoint accepts
         * DnsmasqConfig directly.
         */

        const result =
            await updateDnsmasq(
                dnsmasq
            );


        /*
         * Keep our local configuration synchronized.
         *
         * The current backend response only contains
         * { message }, so keep the object we just sent.
         */

        currentDnsmasqConfig =
            dnsmasq;


        showMessage(
            "dnsmasq-message",
            result.message ??
                "Dnsmasq configuration applied successfully.",
            "success"
        );


    } catch (error) {

        showMessage(
            "dnsmasq-message",
            error.message,
            "error"
        );

        console.error(error);

    } finally {

        saveButton.disabled =
            false;

        saveButton.textContent =
            "Apply configuration";
    }
}

async function getDnsmasqConfig() {

    const response =
        await fetch("/api/dnsmasq");

    if (!response.ok) {

        throw new Error(
            await response.text()
        );

    }

    return response.json();
}


// ==================================================
// MESSAGE
// ==================================================

function showMessage(
    elementId,
    text,
    type
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.textContent =
        text;


    element.className =
        `message visible ${type}`;
}


// ==================================================
// HTML ESCAPING
// ==================================================

function escapeHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;
}


// ==================================================
// START APPLICATION
// ==================================================

function init() {

    /*
     * Register sidebar buttons.
     */

    setupNavigation_debug();


    /*
     * Start on the Network page.
     *
     * No .click() tricks.
     * No dependency on a particular
     * sidebar element existing.
     */

    setActiveNavigation(
        "available"
    );

    showAvailablePage();
}


init();
