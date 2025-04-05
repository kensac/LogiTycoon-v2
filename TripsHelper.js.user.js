// ==UserScript==
// @name         TripsHelper.js
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Helper functions for Trips Automation Module.
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// ==/UserScript==

/**
 * @file TripsHelper.js
 *
 * @description
 *  Provides helper functions for trips automation.
 *
 * @function extractTrips(doc: Document) : Trip[] - Extracts trips from the trips page.
 * @function selectAndAcceptFirstTrip() : void - Auto-selects and accepts the first available trip.
 * @function sendRequest(url: string) : Promise<Response> - Performs a GET request.
 * @function initTrips() : void - Initializes the trips automation.
 *
 * @function fetchFreightDetail(freightId: string) : void - Fetches freight detail.
 *
 * @typedef {Object} Trip
 * @property {string} id
 * @property {number} earnings
 * @property {string} departure
 * @property {string} destination
 * @property {string} distance
 * @property {string} tripType
 */

const TripsHelper = (function() {
    const config = {
        baseUrl: "https://www.logitycoon.com/eu1/",
        endpoints: {
            tripsPage: "index.php?a=trips",
            freightDetail: "index.php?a=freight&n=", // Append freight id
            tripAccept: "ajax/trip_accept.php"
        }
    };

    function extractTrips(doc) {
        const trips = [];
        const table = doc.querySelector("table#rectrips");
        if (!table) {
            console.warn("TripsHelper: Trips table not found.");
            return trips;
        }
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach(row => {
            const trip = {};
            const cells = row.querySelectorAll("td");
            if (cells.length >= 9) {
                const radioInput = cells[0].querySelector("input[type='radio']");
                if (radioInput) {
                    trip.id = radioInput.value;
                }
                let earningsText = cells[1].textContent.trim().replace(/[\$,]/g, "");
                trip.earnings = parseFloat(earningsText);
                trip.departure = cells[2].textContent.trim();
                trip.destination = cells[3].textContent.trim();
                trip.distance = cells[4].textContent.trim();
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
    }

    function selectAndAcceptFirstTrip() {
        const firstRadio = document.querySelector("#rectrips input[type='radio']");
        if (!firstRadio) {
            console.warn("TripsHelper: No available trip found.");
            return;
        }
        firstRadio.checked = true;
        const freightId = firstRadio.value;
        console.log("TripsHelper: Selected trip with freight id:", freightId);
        const postData = `freight[]=${encodeURIComponent(freightId)}`;
        const acceptUrl = config.baseUrl + config.endpoints.tripAccept;
        console.log("TripsHelper: Submitting acceptance for trip:", freightId);
        GM_xmlhttpRequest({
            method: "POST",
            url: acceptUrl,
            data: postData,
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            onload(response) {
                try {
                    const res = JSON.parse(response.responseText);
                    if (res.error === "ERROR_FREIGHT_ACCEPTED") {
                        console.log("TripsHelper: Freight accepted:", res.fullerror);
                        fetchFreightDetail(freightId);
                    } else {
                        console.error("TripsHelper: Error accepting trip:", res.fullerror);
                    }
                } catch (e) {
                    console.error("TripsHelper: Error parsing response:", e);
                }
            },
            onerror(err) {
                console.error("TripsHelper: AJAX error on trip accept:", err);
            }
        });
    }

    function sendRequest(url) {
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
    }

    function initTrips() {
        if (window.location.href.indexOf("a=trips") !== -1) {
            sendRequest(config.baseUrl + config.endpoints.tripsPage)
                .then(response => {
                    const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                    const trips = extractTrips(doc);
                    console.log("TripsHelper: Trips extracted:", trips);
                    if (trips.length > 0) {
                        selectAndAcceptFirstTrip();
                    }
                })
                .catch(err => {
                    console.error("TripsHelper: Error initializing trips module:", err);
                });
        }
    }

    function fetchFreightDetail(freightId) {
        const url = config.baseUrl + config.endpoints.freightDetail + freightId;
        console.log("TripsHelper: Fetching freight detail from", url);
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload(response) {
                console.log(`TripsHelper: Freight detail for id ${freightId}:`, response.responseText);
            },
            onerror(err) {
                console.error(`TripsHelper: Error fetching freight detail for id ${freightId}:`, err);
            }
        });
    }

    return {
        extractTrips,
        selectAndAcceptFirstTrip,
        sendRequest,
        initTrips,
        fetchFreightDetail
    };
})();
