const interfacesContainer = document.getElementById("interfaces");
const refreshButton = document.getElementById("refresh-button");


async function loadInterfaces() {
    interfacesContainer.innerHTML = `
        <p class="loading">Scanning interfaces...</p>
    `;

    try {
        const response = await fetch("/api/interfaces");

        if (!response.ok) {
            throw new Error("Failed to fetch interfaces");
        }

        const interfaces = await response.json();

        renderInterfaces(interfaces);

    } catch (error) {
        interfacesContainer.innerHTML = `
            <p class="error">
                Failed to load network interfaces.
            </p>
        `;

        console.error(error);
    }
}


function renderInterfaces(interfaces) {
    interfacesContainer.innerHTML = "";

    for (const iface of interfaces) {
        const card = document.createElement("div");

        card.className = "interface-card";

        card.innerHTML = `
            <div class="interface-header">
                <div class="interface-name">
                    ${iface.name}
                </div>

                <div class="interface-type">
                    ${iface.type}
                </div>
            </div>

            <div class="details">

                <div class="detail">
                    <span class="label">MAC</span>
                    <span class="value">
                        ${iface.mac_address}
                    </span>
                </div>

                <div class="detail">
                    <span class="label">State</span>
                    <span class="value">
                        ${iface.state}
                    </span>
                </div>

                <div class="detail">
                    <span class="label">Driver</span>
                    <span class="value">
                        ${iface.driver ?? "None"}
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

        interfacesContainer.appendChild(card);
    }
}


refreshButton.addEventListener("click", loadInterfaces);

loadInterfaces();
