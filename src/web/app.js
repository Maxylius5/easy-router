
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


async function getConfig() {

    const response =
        await fetch("/api/config");

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
                            placeholder="EasyRouter"
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
            config,
            interfaces
        ] = await Promise.all([
            getConfig(),
            getInterfaces()
        ]);


        currentConfig =
            config;


        populateHostapdForm(
            config,
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
    config,
    interfaces
) {

    const wifi =
        config.wifi ?? {};


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

    setupNavigation();


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
