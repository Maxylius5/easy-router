const page = document.getElementById("page");
const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");


// --------------------------------------------------
// API
// --------------------------------------------------

async function getConfig() {
    const response = await fetch("/api/config");

    if (!response.ok) {
        throw new Error("Failed to load configuration");
    }

    return response.json();
}


async function saveConfig(config) {
    const response = await fetch("/api/config", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
    });

    if (!response.ok) {
        let message = "Failed to save configuration.";

        try {
            const error = await response.json();
            message = error.detail ?? message;
        } catch {
            // Ignore JSON parsing errors.
        }

        throw new Error(message);
    }

    return response.json();
}


async function getInterfaces() {
    const response = await fetch("/api/interfaces");

    if (!response.ok) {
        throw new Error("Failed to load network interfaces");
    }

    return response.json();
}


// --------------------------------------------------
// Page helpers
// --------------------------------------------------

function setPageHeader(title, description) {
    pageTitle.textContent = title;
    pageDescription.textContent = description;
}


function setActiveNavigation(pageName) {
    document
        .querySelectorAll(".nav-button")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === pageName
            );
        });
}


// --------------------------------------------------
// Dashboard
// --------------------------------------------------

async function showDashboardPage() {
    setPageHeader(
        "Dashboard",
        "Network management dashboard"
    );

    page.innerHTML = `
        <section class="page-section">

            <div class="section-header">
                <div>
                    <h2>Welcome to Easy Router</h2>

                    <p>
                        Manage your router configuration
                        from one place.
                    </p>
                </div>
            </div>

        </section>
    `;
}


// --------------------------------------------------
// Network
// --------------------------------------------------

async function showNetworkPage() {
    setPageHeader(
        "Network",
        "Hardware and interfaces detected on this machine."
    );

    page.innerHTML = `
        <section class="page-section">

            <div class="section-header">
                <div>
                    <h2>Network Interfaces</h2>

                    <p>
                        Hardware and interfaces detected
                        on this machine.
                    </p>
                </div>

                <button id="refresh-button">
                    Refresh
                </button>
            </div>

            <div id="interfaces" class="interfaces">
                <p class="loading">
                    Scanning interfaces...
                </p>
            </div>

        </section>
    `;

    const refreshButton =
        document.getElementById("refresh-button");

    refreshButton.addEventListener(
        "click",
        loadInterfaces
    );

    await loadInterfaces();
}


async function loadInterfaces() {
    const container =
        document.getElementById("interfaces");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <p class="loading">
            Scanning interfaces...
        </p>
    `;

    try {
        const interfaces = await getInterfaces();

        renderInterfaces(interfaces);

    } catch (error) {
        container.innerHTML = `
            <p class="error">
                ${escapeHtml(error.message)}
            </p>
        `;

        console.error(error);
    }
}


function renderInterfaces(interfaces) {
    const container =
        document.getElementById("interfaces");

    container.innerHTML = "";

    for (const iface of interfaces) {
        const card = document.createElement("div");

        card.className = "interface-card";

        card.innerHTML = `
            <div class="interface-header">

                <div class="interface-name">
                    ${escapeHtml(iface.name)}
                </div>

                <div class="interface-type">
                    ${escapeHtml(iface.interface_type)}
                </div>

            </div>

            <div class="details">

                <div class="detail">
                    <span class="label">MAC</span>

                    <span class="value">
                        ${escapeHtml(iface.mac_address)}
                    </span>
                </div>

                <div class="detail">
                    <span class="label">State</span>

                    <span class="value">
                        ${escapeHtml(iface.state)}
                    </span>
                </div>

                <div class="detail">
                    <span class="label">Driver</span>

                    <span class="value">
                        ${escapeHtml(iface.driver ?? "None")}
                    </span>
                </div>

                <div class="detail">
                    <span class="label">Physical</span>

                    <span class="value">
                        ${iface.is_physical ? "Yes" : "No"}
                    </span>
                </div>

            </div>
        `;

        container.appendChild(card);
    }
}


// --------------------------------------------------
// Wi-Fi
// --------------------------------------------------

async function showWifiPage() {
    setPageHeader(
        "Wi-Fi",
        "Configure the wireless access point."
    );

    page.innerHTML = `
        <section class="page-section">

            <div id="wifi-loading">
                <p class="loading">
                    Loading Wi-Fi configuration...
                </p>
            </div>

        </section>
    `;

    try {
        const [config, interfaces] = await Promise.all([
            getConfig(),
            getInterfaces(),
        ]);

        renderWifiPage(config, interfaces);

    } catch (error) {
        page.innerHTML = `
            <section class="page-section">

                <div class="error-card">
                    <h2>Unable to load Wi-Fi</h2>

                    <p>
                        ${escapeHtml(error.message)}
                    </p>

                </div>

            </section>
        `;

        console.error(error);
    }
}


function getWifiInterfaces(interfaces) {
    return interfaces.filter(
        iface => iface.interface_type === "wifi"
    );
}


function renderWifiPage(config, interfaces) {
    const wifiInterfaces =
        getWifiInterfaces(interfaces);

    const wifi = config.wifi;

    page.innerHTML = `
        <section class="page-section">

            <div class="section-header">
                <div>
                    <h2>Access Point</h2>

                    <p>
                        Configure the wireless access point.
                    </p>
                </div>

                <div
                    class="status-badge ${
                        wifi.enabled
                            ? "status-enabled"
                            : "status-disabled"
                    }"
                >
                    ${
                        wifi.enabled
                            ? "Enabled"
                            : "Disabled"
                    }
                </div>
            </div>


            <div class="card">

                <div class="form-row toggle-row">

                    <div>
                        <label
                            for="wifi-enabled"
                            class="form-label"
                        >
                            Enable access point
                        </label>

                        <p class="form-help">
                            Start using this Wi-Fi interface
                            as a wireless access point.
                        </p>
                    </div>

                    <label class="switch">

                        <input
                            type="checkbox"
                            id="wifi-enabled"
                            ${
                                wifi.enabled
                                    ? "checked"
                                    : ""
                            }
                        >

                        <span class="slider"></span>

                    </label>

                </div>


                <div class="form-row">

                    <label
                        for="wifi-interface"
                        class="form-label"
                    >
                        Interface
                    </label>

                    <select
                        id="wifi-interface"
                    >

                        ${
                            wifiInterfaces.length === 0
                                ? `
                                    <option value="">
                                        No Wi-Fi interfaces found
                                    </option>
                                  `
                                : wifiInterfaces
                                    .map(iface => `
                                        <option
                                            value="${escapeHtml(iface.name)}"
                                            ${
                                                iface.name === wifi.interface
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            ${escapeHtml(iface.name)}
                                        </option>
                                    `)
                                    .join("")
                        }

                    </select>

                    <p class="form-help">
                        Select the wireless interface that
                        hostapd will control.
                    </p>

                </div>


                <div class="form-row">

                    <label
                        for="wifi-ssid"
                        class="form-label"
                    >
                        SSID
                    </label>

                    <input
                        id="wifi-ssid"
                        type="text"
                        maxlength="32"
                        value="${escapeHtml(wifi.ssid)}"
                        placeholder="EasyRouter"
                    >

                    <p class="form-help">
                        The name visible to Wi-Fi clients.
                    </p>

                </div>


                <div class="form-row">

                    <label
                        for="wifi-password"
                        class="form-label"
                    >
                        Password
                    </label>

                    <input
                        id="wifi-password"
                        type="password"
                        minlength="8"
                        maxlength="63"
                        value="${escapeHtml(wifi.password)}"
                        placeholder="Wi-Fi password"
                    >

                    <p class="form-help">
                        WPA2 password, 8–63 characters.
                    </p>

                </div>


                <div class="form-row">

                    <label
                        for="wifi-country"
                        class="form-label"
                    >
                        Country
                    </label>

                    <select id="wifi-country">

                        <option
                            value="NL"
                            ${
                                wifi.country === "NL"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Netherlands
                        </option>

                        <option
                            value="DE"
                            ${
                                wifi.country === "DE"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Germany
                        </option>

                        <option
                            value="BE"
                            ${
                                wifi.country === "BE"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Belgium
                        </option>

                        <option
                            value="GB"
                            ${
                                wifi.country === "GB"
                                    ? "selected"
                                    : ""
                            }
                        >
                            United Kingdom
                        </option>

                    </select>

                </div>


                <div class="form-row">

                    <label
                        for="wifi-channel"
                        class="form-label"
                    >
                        Channel
                    </label>

                    <select id="wifi-channel">

                        ${
                            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
                                .map(channel => `
                                    <option
                                        value="${channel}"
                                        ${
                                            channel === wifi.channel
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${channel}
                                    </option>
                                `)
                                .join("")
                        }

                    </select>

                    <p class="form-help">
                        2.4 GHz channel. We will make this
                        hardware-aware in the next step.
                    </p>

                </div>


                <div class="form-actions">

                    <button
                        id="save-wifi"
                        class="primary-button"
                    >
                        Save configuration
                    </button>

                </div>


                <div
                    id="wifi-message"
                    class="message"
                ></div>

            </div>

        </section>
    `;


    document
        .getElementById("save-wifi")
        .addEventListener(
            "click",
            saveWifiConfig
        );
}


async function saveWifiConfig() {
    const message =
        document.getElementById("wifi-message");

    const button =
        document.getElementById("save-wifi");

    button.disabled = true;

    message.className = "message";
    message.textContent = "Saving...";

    try {
        const config = await getConfig();

        config.wifi.enabled =
            document.getElementById(
                "wifi-enabled"
            ).checked;

        config.wifi.interface =
            document.getElementById(
                "wifi-interface"
            ).value;

        config.wifi.ssid =
            document.getElementById(
                "wifi-ssid"
            ).value;

        config.wifi.password =
            document.getElementById(
                "wifi-password"
            ).value;

        config.wifi.country =
            document.getElementById(
                "wifi-country"
            ).value;

        config.wifi.channel =
            Number(
                document.getElementById(
                    "wifi-channel"
                ).value
            );


        await saveConfig(config);

        message.className =
            "message success";

        message.textContent =
            "Configuration saved successfully.";

    } catch (error) {

        message.className =
            "message error";

        message.textContent =
            error.message;

        console.error(error);

    } finally {

        button.disabled = false;

    }
}


// --------------------------------------------------
// Other pages
// --------------------------------------------------

async function showPlaceholderPage(
    title,
    description
) {
    setPageHeader(title, description);

    page.innerHTML = `
        <section class="page-section">

            <div class="empty-page">

                <h2>${escapeHtml(title)}</h2>

                <p>
                    This section is not implemented yet.
                </p>

            </div>

        </section>
    `;
}


// --------------------------------------------------
// Navigation
// --------------------------------------------------

function setupNavigation() {
    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const pageName =
                        button.dataset.page;

                    setActiveNavigation(pageName);

                    switch (pageName) {

                        case "dashboard":
                            await showDashboardPage();
                            break;

                        case "network":
                            await showNetworkPage();
                            break;

                        case "wifi":
                            await showWifiPage();
                            break;

                        case "dhcp":
                            await showPlaceholderPage(
                                "DHCP & DNS",
                                "Configure DHCP and DNS services."
                            );
                            break;

                        case "wireguard":
                            await showPlaceholderPage(
                                "WireGuard",
                                "Configure WireGuard VPN."
                            );
                            break;

                        case "firewall":
                            await showPlaceholderPage(
                                "Firewall",
                                "Configure firewall and NAT rules."
                            );
                            break;

                        case "system":
                            await showPlaceholderPage(
                                "System",
                                "Manage system services and settings."
                            );
                            break;
                    }
                }
            );

        });
}


// --------------------------------------------------
// Utilities
// --------------------------------------------------

function escapeHtml(value) {
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}


// --------------------------------------------------
// Startup
// --------------------------------------------------


async function init() {
    setupNavigation();

    const wifiButton = document.querySelector(
        '[data-page="wifi"]'
    );

    if (wifiButton) {
        wifiButton.click();
    }
}


init();
