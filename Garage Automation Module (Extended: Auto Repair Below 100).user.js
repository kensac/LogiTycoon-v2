// ==UserScript==
// @name         Garage Automation Module (Extended: Auto Repair Below 100)
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Parses the Garage page to extract trucks and trailers. For each, visits the detail page to extract extra info (e.g. condition, tire data). If the condition is below 100, automatically triggers the repair endpoint.
// @match        https://www.logitycoon.com/eu1/*
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// ==/UserScript==

/**
 * @file GarageAutomation.js
 *
 * @description
 *  Garage Automation Module.
 *
 * @function init() : void - Fetches the Garage page, extracts vehicles, and processes each.
 * @function sendRequest(url: string) : Promise<Response> - Performs a GET request.
 * @function sendPostRequest(url: string, data: string) : Promise<Response> - Performs a POST request.
 * @function fetchGaragePage() : void - Fetches the Garage page and extracts vehicles.
 * @function extractVehicles(doc: Document) : { trucks: Truck[], trailers: Trailer[] } - Parses the document to extract truck and trailer entries.
 * @function parseTruck(entry: HTMLElement) : Truck - Extracts a Truck object from a truck entry element.
 * @function parseTrailer(entry: HTMLElement) : Trailer - Extracts a Trailer object from a trailer entry element.
 * @function processTruckDetail(truck: Truck) : void - Extracts extra info from the truck detail page and triggers repair if condition < 100.
 * @function processTrailerDetail(trailer: Trailer) : void - Extracts extra info from the trailer detail page and triggers repair if condition < 100.
 * @function repairTruck(truckId: string) : void - Sends a repair request for a truck.
 * @function repairTrailer(trailerId: string) : void - Sends a repair request for a trailer.
 *
 * @typedef {Object} Truck
 * @property {string} id
 * @property {string} name
 * @property {number} [condition]
 * @property {number} [tireCondition]
 * @property {string} [tireType]
 *
 * @typedef {Object} Trailer
 * @property {string} id
 * @property {string} name
 * @property {number} [condition]
 */


//////////////////////////
// Global Configuration //
//////////////////////////

const GlobalConfig = {
    baseUrl: "https://www.logitycoon.com/eu1/",
    endpoints: {
        garagePage: "index.php?a=garage",
        truckDetail: "index.php?a=garage_truck&t=",       // Append truck id
        trailerDetail: "index.php?a=garage_trailer&t=",    // Append trailer id
        repair: "ajax/garage_repair.php"                  // POST endpoint for repairs
    }
};

//////////////////////
// Request Wrappers //
//////////////////////

const RequestWrapper = {
    /**
     * Performs a GET request.
     * @param {string} url - The URL to fetch.
     * @returns {Promise<Response>}
     */
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

    /**
     * Performs a POST request.
     * @param {string} url - The URL to post to.
     * @param {string} data - The URL-encoded form data.
     * @returns {Promise<Response>}
     */
    sendPostRequest(url, data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: data,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                onload(response) {
                    resolve(response);
                },
                onerror(err) {
                    reject(err);
                }
            });
        });
    }
};

///////////////////////////////
// GarageAutomation Module   //
///////////////////////////////

const GarageAutomation = {
    config: GlobalConfig,

    /**
     * Entry point: initializes the automation by fetching the Garage page.
     */
    init() {
        console.log("GarageAutomation: Initializing...");
        this.fetchGaragePage();
    },

    /**
     * Fetches the Garage page and processes vehicle entries.
     */
    fetchGaragePage() {
        const url = this.config.baseUrl + this.config.endpoints.garagePage;
        RequestWrapper.sendRequest(url)
            .then(response => {
                const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                const vehicles = this.extractVehicles(doc);
                console.log("GarageAutomation: Extracted vehicles:", vehicles);
                vehicles.trucks.forEach(truck => this.processTruckDetail(truck));
                vehicles.trailers.forEach(trailer => this.processTrailerDetail(trailer));
            })
            .catch(err => {
                console.error("GarageAutomation: Error fetching garage page:", err);
            });
    },

    /**
     * Extracts trucks and trailers from the Garage page document.
     * @param {Document} doc
     * @returns {{ trucks: Truck[], trailers: Trailer[] }}
     */
    extractVehicles(doc) {
        const vehicles = { trucks: [], trailers: [] };
        // Assume each portlet with class "portlet light" contains a section.
        const portlets = doc.querySelectorAll("div.portlet.light");
        portlets.forEach(portlet => {
            const titleEl = portlet.querySelector("div.portlet-title");
            if (!titleEl) return;
            const titleText = titleEl.textContent.trim();
            if (titleText.includes("Trucks")) {
                const truckEntries = portlet.querySelectorAll("div.mt-action");
                truckEntries.forEach(entry => {
                    const truck = this.parseTruck(entry);
                    if (truck) vehicles.trucks.push(truck);
                });
            } else if (titleText.includes("Trailers")) {
                const trailerEntries = portlet.querySelectorAll("div.mt-action");
                trailerEntries.forEach(entry => {
                    const trailer = this.parseTrailer(entry);
                    if (trailer) vehicles.trailers.push(trailer);
                });
            }
        });
        return vehicles;
    },

    /**
     * Parses a truck entry element to create a Truck object.
     * @param {HTMLElement} entry
     * @returns {Truck|null}
     */
    parseTruck(entry) {
        const truck = {};
        // Use the "Information" button for id extraction.
        const infoBtn = entry.querySelector("button[onclick*='garage_truck&t=']");
        if (infoBtn && infoBtn.getAttribute("onclick")) {
            const onclickText = infoBtn.getAttribute("onclick");
            const match = onclickText.match(/t=(\d+)/);
            if (match && match[1]) {
                truck.id = match[1];
            }
        }
        const nameEl = entry.querySelector("span.mt-action-author") || entry.querySelector("a");
        truck.name = nameEl ? nameEl.textContent.trim() : "Unknown Truck";
        const infoRows = entry.querySelectorAll("div.row.static-info");
        infoRows.forEach(row => {
            const labelEl = row.querySelector("div.name");
            const valueEl = row.querySelector("div.value");
            if (labelEl && valueEl) {
                let label = labelEl.textContent.replace(/[\n\r]+/g, " ").trim().replace(":", "").toLowerCase();
                let value = valueEl.textContent.replace(/[\n\r]+/g, " ").trim();
                truck[label] = value;
            }
        });
        return truck;
    },

    /**
     * Parses a trailer entry element to create a Trailer object.
     * @param {HTMLElement} entry
     * @returns {Trailer|null}
     */
    parseTrailer(entry) {
        const trailer = {};
        const infoBtn = entry.querySelector("button[onclick*='garage_trailer&t=']");
        if (infoBtn && infoBtn.getAttribute("onclick")) {
            const onclickText = infoBtn.getAttribute("onclick");
            const match = onclickText.match(/t=(\d+)/);
            if (match && match[1]) {
                trailer.id = match[1];
            }
        }
        const nameEl = entry.querySelector("span.mt-action-author") || entry.querySelector("a");
        trailer.name = nameEl ? nameEl.textContent.trim() : "Unknown Trailer";
        const infoRows = entry.querySelectorAll("div.row.static-info");
        infoRows.forEach(row => {
            const labelEl = row.querySelector("div.name");
            const valueEl = row.querySelector("div.value");
            if (labelEl && valueEl) {
                let label = labelEl.textContent.replace(/[\n\r]+/g, " ").trim().replace(":", "").toLowerCase();
                let value = valueEl.textContent.replace(/[\n\r]+/g, " ").trim();
                trailer[label] = value;
            }
        });
        return trailer;
    },

    /**
     * Processes the truck detail page.
     * @param {Truck} truck
     */
    processTruckDetail(truck) {
        if (!truck.id) {
            console.warn("Truck detail skipped; missing id for", truck);
            return;
        }
        const detailUrl = this.config.baseUrl + this.config.endpoints.truckDetail + truck.id;
        RequestWrapper.sendRequest(detailUrl)
            .then(response => {
                // Extract overall condition using a regex.
                const conditionRegex = /new\s+ProgressBar\([^,]+,\s*\d+,\s*\d+,\s*(\-?\d+)\s*\)/;
                const conditionMatch = conditionRegex.exec(response.responseText);
                if (conditionMatch && conditionMatch[1]) {
                    truck.condition = parseInt(conditionMatch[1], 10);
                    console.log(`Truck ${truck.id} condition: ${truck.condition}`);
                } else {
                    console.warn(`Truck ${truck.id}: overall condition not found.`);
                }
                // Extract tire condition from a progress bar with id "tirecondition".
                const tireConditionRegex = /new\s+ProgressBar\(['"]tirecondition['"],\s*\d+,\s*\d+,\s*(\-?\d+)\s*\)/;
                const tireConditionMatch = tireConditionRegex.exec(response.responseText);
                if (tireConditionMatch && tireConditionMatch[1]) {
                    truck.tireCondition = parseInt(tireConditionMatch[1], 10);
                    console.log(`Truck ${truck.id} tire condition: ${truck.tireCondition}`);
                } else {
                    console.warn(`Truck ${truck.id}: tire condition not found.`);
                }
                // Extract tire type from a label element (if present).
                const detailDoc = new DOMParser().parseFromString(response.responseText, "text/html");
                const tireLabelEl = detailDoc.querySelector("span.label-warning");
                truck.tireType = tireLabelEl ? tireLabelEl.textContent.trim() : "Unknown";
                console.log(`Truck ${truck.id} tire type: ${truck.tireType}`);

                // If condition is below 100, trigger repair.
                if (truck.condition < 100) {
                    console.log(`Truck ${truck.id} condition below 100; initiating repair.`);
                    this.repairTruck(truck.id);
                }
            })
            .catch(err => {
                console.error(`Error processing truck ${truck.id} detail:`, err);
            });
    },

    /**
     * Processes the trailer detail page.
     * @param {Trailer} trailer
     */
    processTrailerDetail(trailer) {
        if (!trailer.id) {
            console.warn("Trailer detail skipped; missing id for", trailer);
            return;
        }
        const detailUrl = this.config.baseUrl + this.config.endpoints.trailerDetail + trailer.id;
        RequestWrapper.sendRequest(detailUrl)
            .then(response => {
                const regex = /new\s+ProgressBar\([^,]+,\s*\d+,\s*\d+,\s*(\-?\d+)\s*\)/;
                const match = regex.exec(response.responseText);
                if (match && match[1]) {
                    trailer.condition = parseInt(match[1], 10);
                    console.log(`Trailer ${trailer.id} condition: ${trailer.condition}`);
                } else {
                    console.warn(`Trailer ${trailer.id}: condition not found.`);
                }
                if (trailer.condition < 100) {
                    console.log(`Trailer ${trailer.id} condition below 100; initiating repair.`);
                    this.repairTrailer(trailer.id);
                }
            })
            .catch(err => {
                console.error(`Error processing trailer ${trailer.id} detail:`, err);
            });
    },

    /**
     * Sends a repair request for a truck.
     * @param {string} truckId
     */
    repairTruck(truckId) {
        const repairUrl = this.config.baseUrl + this.config.endpoints.repair;
        const postData = `repairtruck=${truckId}`;
        RequestWrapper.sendPostRequest(repairUrl, postData)
            .then(response => {
                try {
                    const res = JSON.parse(response.responseText);
                    if (res.error === "SUCCESS") {
                        console.log(`Truck ${truckId} repaired successfully.`);
                    } else {
                        console.error(`Failed to repair truck ${truckId}:`, res.fullerror);
                    }
                } catch (e) {
                    console.error("Error parsing truck repair response:", e);
                }
            })
            .catch(err => {
                console.error(`Error repairing truck ${truckId}:`, err);
            });
    },

    /**
     * Sends a repair request for a trailer.
     * @param {string} trailerId
     */
    repairTrailer(trailerId) {
        const repairUrl = this.config.baseUrl + this.config.endpoints.repair;
        const postData = `repairtrailer=${trailerId}`;
        RequestWrapper.sendPostRequest(repairUrl, postData)
            .then(response => {
                try {
                    const res = JSON.parse(response.responseText);
                    if (res.error === "SUCCESS") {
                        console.log(`Trailer ${trailerId} repaired successfully.`);
                    } else {
                        console.error(`Failed to repair trailer ${trailerId}:`, res.fullerror);
                    }
                } catch (e) {
                    console.error("Error parsing trailer repair response:", e);
                }
            })
            .catch(err => {
                console.error(`Error repairing trailer ${trailerId}:`, err);
            });
    }
};

//////////////////////////
// Initialization Entry //
//////////////////////////

// When the script is loaded, initialize the GarageAutomation module.
GarageAutomation.init();
