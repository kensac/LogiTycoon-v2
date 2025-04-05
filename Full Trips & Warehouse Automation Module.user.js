// ==UserScript==
// @name         Full Trips & Warehouse Automation Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically selects the first available trip (if prerequisites are met), accepts it, then extracts active freight details and warehouse freight info.
// @match        https://www.logitycoon.com/eu1/index.php?a=trips*
// @match        https://www.logitycoon.com/eu1/index.php?a=warehouse*
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// ==/UserScript==

(function() {
    'use strict';

    /**************** Global Configuration ****************/
    const config = {
        baseUrl: "https://www.logitycoon.com/eu1/",
        endpoints: {
            tripsPage: "index.php?a=trips",
            warehousePage: "index.php?a=warehouse",
            freightDetail: "index.php?a=freight&n=", // Append freight id
            tripAccept: "ajax/trip_accept.php"
        }
    };

    /**************** TripsAutomation Module ****************/
    const TripsAutomation = {
        // Extract trips from the trips page.
        extractTrips(doc) {
            const trips = [];
            // Our trips table has id "rectrips"
            const table = doc.querySelector("table#rectrips");
            if (!table) {
                console.warn("TripsAutomation: Trips table not found.");
                return trips;
            }
            const rows = table.querySelectorAll("tbody tr");
            rows.forEach(row => {
                const trip = {};
                const cells = row.querySelectorAll("td");
                if (cells.length >= 9) {
                    // Extract freight id from the radio button value.
                    const radioInput = cells[0].querySelector("input[type='radio']");
                    if (radioInput) {
                        trip.id = radioInput.value;
                    }
                    // Earnings from column 2.
                    let earningsText = cells[1].textContent.trim().replace(/[\$,]/g, "");
                    trip.earnings = parseFloat(earningsText);
                    // Departure and Destination from columns 3 and 4.
                    trip.departure = cells[2].textContent.trim();
                    trip.destination = cells[3].textContent.trim();
                    // Distance from column 5.
                    trip.distance = cells[4].textContent.trim();
                    // Trip type from column 9 (after removing any images).
                    const typeSpan = cells[8].querySelector("span");
                    if (typeSpan) {
                        const img = typeSpan.querySelector("img");
                        if (img) img.remove();
                        trip.tripType = typeSpan.textContent.trim();
                    } else {
                        trip.tripType = "";
                    }
                    trips.push(trip);
                }
            });
            return trips;
        },

        // Auto-select the first available trip and simulate its acceptance.
        selectAndAcceptFirstTrip() {
            const firstRadio = document.querySelector("#rectrips input[type='radio']");
            if (!firstRadio) {
                console.warn("TripsAutomation: No available trip found.");
                return;
            }
            firstRadio.checked = true;
            const freightId = firstRadio.value;
            console.log("TripsAutomation: Selected trip with freight id:", freightId);

            // Prepare POST data (assuming format freight[]=<id>)
            const postData = `freight[]=${encodeURIComponent(freightId)}`;
            const acceptUrl = config.baseUrl + config.endpoints.tripAccept;
            console.log("TripsAutomation: Submitting acceptance for trip:", freightId);
            GM_xmlhttpRequest({
                method: "POST",
                url: acceptUrl,
                data: postData,
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                onload(response) {
                    try {
                        const res = JSON.parse(response.responseText);
                        if (res.error === "ERROR_FREIGHT_ACCEPTED") {
                            console.log("TripsAutomation: Freight accepted:", res.fullerror);
                            // Fetch freight detail and warehouse info once accepted.
                            FreightAutomation.fetchFreightDetail(freightId);
                            WarehouseAutomation.fetchWarehousePage();
                        } else {
                            console.error("TripsAutomation: Error accepting trip:", res.fullerror);
                        }
                    } catch (e) {
                        console.error("TripsAutomation: Error parsing response:", e);
                    }
                },
                onerror(err) {
                    console.error("TripsAutomation: AJAX error on trip accept:", err);
                }
            });
        },

        // Helper GET wrapper.
        sendRequest(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    onload(response) {
                        resolve(response);
                    },
                    onerror(err) {
                        reject(err);
                    }
                });
            });
        },

        // Initialize if on the trips page.
        init() {
            if (window.location.href.indexOf("a=trips") !== -1) {
                this.sendRequest(config.baseUrl + config.endpoints.tripsPage)
                    .then(response => {
                        const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                        const trips = this.extractTrips(doc);
                        console.log("TripsAutomation: Trips extracted:", trips);
                        if (trips.length > 0) {
                            this.selectAndAcceptFirstTrip();
                        }
                    })
                    .catch(err => {
                        console.error("TripsAutomation: Error initializing trips module:", err);
                    });
            }
        }
    };

    /**************** FreightAutomation Module ****************/
    const FreightAutomation = {
        // Fetch freight detail page and extract info.
        fetchFreightDetail(freightId) {
            const url = config.baseUrl + config.endpoints.freightDetail + freightId;
            console.log("FreightAutomation: Fetching freight detail from", url);
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload(response) {
                    console.log(`FreightAutomation: Freight detail for id ${freightId}:`, response.responseText);
                    // You can later parse this detail page to extract more specific information.
                },
                onerror(err) {
                    console.error(`FreightAutomation: Error fetching freight detail for id ${freightId}:`, err);
                }
            });
        }
    };

    /**************** WarehouseAutomation Module ****************/
    const WarehouseAutomation = {
        // Fetch the Warehouse page and extract freight info.
        fetchWarehousePage() {
            const url = config.baseUrl + config.endpoints.warehousePage;
            console.log("WarehouseAutomation: Fetching warehouse page from", url);
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload(response) {
                    const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                    const freightInfo = WarehouseAutomation.extractFreightInfo(doc);
                    console.log("WarehouseAutomation: Extracted freight info:", freightInfo);
                    // Further processing can be added here.
                },
                onerror(err) {
                    console.error("WarehouseAutomation: Error fetching warehouse page:", err);
                }
            });
        },

        // Extract freight/trip info from the freight table.
        extractFreightInfo(doc) {
            const freights = [];
            // Assume freight table is in tbody with id "tbody-available"
            const tbody = doc.querySelector("tbody#tbody-available");
            if (!tbody) {
                console.warn("WarehouseAutomation: Freight table (tbody#tbody-available) not found.");
                return freights;
            }
            tbody.querySelectorAll("tr").forEach(row => {
                const freight = {};
                const cells = Array.from(row.children);
                // --- Example extraction based on desktop layout ---
                // Look for a cell (with class "hidden-xs") that begins with '#' for freight id.
                const idCell = cells.find(cell => cell.classList.contains("hidden-xs") && cell.textContent.trim().startsWith("#"));
                if (idCell) {
                    freight.id = idCell.textContent.trim().replace("#", "");
                }
                // Earnings from the second cell (hidden-xs)
                if (cells[1]) {
                    let earningsText = cells[1].textContent.trim().replace(/[\$,]/g, "");
                    freight.earnings = parseFloat(earningsText);
                }
                // Departure from the first "visible-sm" cell.
                const visibleCells = cells.filter(cell => cell.classList.contains("visible-sm"));
                if (visibleCells.length > 0) {
                    const departureCell = visibleCells[0];
                    const depImg = departureCell.querySelector("img");
                    if (depImg) depImg.remove();
                    freight.departure = departureCell.textContent.trim();
                }
                // Destination from the second "visible-sm" cell.
                if (visibleCells.length > 1) {
                    const destinationCell = visibleCells[1];
                    const destImg = destinationCell.querySelector("img");
                    if (destImg) destImg.remove();
                    freight.destination = destinationCell.textContent.trim();
                }
                // Distance: find a cell ending with "km"
                const distanceCell = cells.find(cell => cell.textContent.trim().endsWith("km"));
                if (distanceCell) {
                    freight.distance = distanceCell.textContent.trim();
                }
                // Freight type from a cell that contains the freight type text (e.g., "Default")
                const typeCell = cells.find(cell => cell.classList.contains("hidden-xs") && cell.textContent.toLowerCase().includes("default"));
                if (typeCell) {
                    const span = typeCell.querySelector("span");
                    if (span) {
                        const img = span.querySelector("img");
                        if (img) img.remove();
                        freight.tripType = span.textContent.trim();
                    } else {
                        freight.tripType = typeCell.textContent.trim();
                    }
                }
                freights.push(freight);
            });
            return freights;
        }
    };

    /**************** Initialization Sequence ****************/
    const currentURL = window.location.href;
    if (currentURL.indexOf("a=trips") !== -1) {
        TripsAutomation.init();
    } else if (currentURL.indexOf("a=warehouse") !== -1) {
        WarehouseAutomation.fetchWarehousePage();
    } else if (currentURL.indexOf("a=freight") !== -1) {
        console.log("Freight detail page detected.");
    }
})();
