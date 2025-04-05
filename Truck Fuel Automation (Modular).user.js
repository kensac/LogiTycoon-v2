// ==UserScript==
// @name         Truck Fuel Automation (Modular)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Parse truck information from the Fuel Station page and refuel any truck with low fuel.
// @match        https://www.logitycoon.com/eu1/*
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// ==/UserScript==

(function() {
    'use strict';

    const TruckAutomation = {
        // Configuration for endpoints and fuel threshold
        config: {
            baseUrl: "https://www.logitycoon.com/eu1/",
            endpoints: {
                fuelStationPage: "index.php?a=fuelstation",
                truckRefuel: "ajax/fuelstation_refuel.php" // refuel endpoint expects: ?x=truckId&p=1&returnfr=0
            },
            // If the truck's fuel percentage is below this threshold, we will refuel it.
            thresholdFuelPercentage: 99
        },

        // Entry point
        init() {
            this.fetchFuelStationPage();
        },

        // Generic GET request wrapped in a Promise for easy chaining.
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

        // Fetch the fuel station page and then extract and process truck information.
        fetchFuelStationPage() {
            const url = this.config.baseUrl + this.config.endpoints.fuelStationPage;
            this.sendRequest(url)
                .then(response => {
                    const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                    const trucks = this.extractTrucks(doc);
                    console.log("Extracted Trucks:", trucks);
                    trucks.forEach(truck => this.processTruck(truck));
                })
                .catch(err => {
                    console.error("Error fetching fuel station page:", err);
                });
        },

        // Extract truck data from the page.
        // The page organizes each truck in a <tbody> whose id begins with "truck-".
        // Within each tbody, we assume a <span> with an id starting with "fuel" contains a script
        // that calls new ProgressBar(elementId, min, max, current). We use a regex to extract these numbers.
        extractTrucks(doc) {
            const trucks = [];
            const tbodies = doc.querySelectorAll("tbody[id^='truck-']");
            tbodies.forEach(tbody => {
                const truck = {};
                // Extract truck ID from the tbody element's id (e.g., "truck-2809719")
                truck.id = tbody.id.split("truck-")[1];

                // Get truck name from the first row.
                const firstRow = tbody.querySelector("tr");
                if (firstRow) {
                    // Optionally, refine this extraction if the truck name is wrapped in a link.
                    const link = firstRow.querySelector("a[href*='fuelstation']");
                    truck.name = link ? link.textContent.trim() : firstRow.textContent.trim();
                }

                // Locate the <span> element that should contain the fuel progress bar info.
                const spanFuel = tbody.querySelector("span[id^='fuel']");
                if (spanFuel) {
                    // Use a regex to extract min, max, and current fuel values from the ProgressBar call.
                    // Expected format: new ProgressBar('fuelX', 0, 520, 26);
                    const scriptContent = spanFuel.innerHTML;
                    const regex = /new\s+ProgressBar\([^,]+,\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/;
                    const match = regex.exec(scriptContent);
                    if (match) {
                        const min = parseInt(match[1], 10);
                        const max = parseInt(match[2], 10);
                        const current = parseInt(match[3], 10);
                        truck.fuelMin = min;
                        truck.fuelMax = max;
                        truck.fuelCurrent = current;
                        truck.fuelPercentage = ((current - min) / (max - min)) * 100;
                    } else {
                        // If not found, assume full fuel.
                        truck.fuelPercentage = 100;
                    }
                } else {
                    truck.fuelPercentage = 100;
                }

                trucks.push(truck);
            });
            return trucks;
        },

        // Process each truck: if its fuel percentage is below the threshold, trigger a refuel.
        processTruck(truck) {
            console.log(`Truck ${truck.id} (${truck.name}) fuel: ${truck.fuelCurrent || "N/A"}/${truck.fuelMax || "N/A"} (${truck.fuelPercentage.toFixed(2)}%)`);
            if (truck.fuelPercentage < this.config.thresholdFuelPercentage) {
                console.log(`Truck ${truck.id} has low fuel (${truck.fuelPercentage.toFixed(2)}%). Initiating refuel...`);
                const refuelUrl = `${this.config.baseUrl}${this.config.endpoints.truckRefuel}?x=${truck.id}&p=1&returnfr=0`;
                this.sendRequest(refuelUrl)
                    .then(response => {
                        console.log(`Refuel response for truck ${truck.id}:`, response.responseText);
                    })
                    .catch(err => {
                        console.error(`Error refueling truck ${truck.id}:`, err);
                    });
            } else {
                console.log(`Truck ${truck.id} fuel is sufficient (${truck.fuelPercentage.toFixed(2)}%).`);
            }
        }
    };

    // Initialize the truck automation module.
    TruckAutomation.init();
})();
