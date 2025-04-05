// ==UserScript==
// @name         MainAutomation.js
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Main file that integrates Trips, Warehouse, and Freight automation helpers. On dashboard load it checks available trips on the warehouse page; if there are fewer than n trips, it simulates visiting the trips page repeatedly until enough trips are available. Then it opens each trip page (using the freight URL) in new tabs for 2 minutes, closes them, refreshes the dashboard page, and starts over.
// @match        https://www.logitycoon.com/eu1/index.php?a=trips*
// @match        https://www.logitycoon.com/eu1/index.php?a=warehouse*
// @match        https://www.logitycoon.com/eu1/index.php?a=freight*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      www.logitycoon.com
// @resource     TripsHelper.js
// @require      https://github.com/kensac/LogiTycoon-v2/raw/refs/heads/main/WarehouseHelper.js.user.js
// @require      https://github.com/kensac/LogiTycoon-v2/raw/refs/heads/main/FreightHelper.js.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const TRIP_THRESHOLD = 2; // Desired number of available trips
    const TRIP_WINDOW_DURATION = 30 * 1000; // For testing: 30 seconds (adjust as needed)

    // --- Helper: Simulate a cycle of visiting the trips page.
    // This function opens a new tab using GM_openInTab to the trips page, waits 5 seconds,
    // then simply closes that tab. It repeats this for the specified number of cycles.
    function simulateTripsCycle(cycles) {
        return new Promise((resolve) => {
            let count = 0;
            function cycle() {
                if (count >= cycles) {
                    resolve();
                } else {
                    console.log(`Simulating trips cycle ${count + 1} of ${cycles}`);
                    // Open the trips page in a new tab.
                    let simTab = GM_openInTab("https://www.logitycoon.com/eu1/index.php?a=trips", {active: true, insert: true});
                    // Wait 5 seconds then close the tab.
                    setTimeout(() => {
                        if (simTab && !simTab.closed) {
                            simTab.close();
                        }
                        count++;
                        // Wait a short interval before starting the next cycle.
                        setTimeout(cycle, 3000);
                    }, 5000);
                }
            }
            cycle();
        });
    }

    // --- Helper: Open each trip page in a new tab.
    // This function opens a new tab for each trip (constructed via its id) using GM_openInTab.
    // After TRIP_WINDOW_DURATION, all opened tabs are closed and the dashboard is reloaded.
    function openTripPages(trips) {
        console.log("Opening trip pages for trips:", trips);
        let tripTabs = [];
        trips.forEach(trip => {
            // Construct the freight URL for the trip.
            let tripUrl = "https://www.logitycoon.com/eu1/index.php?a=freight&n=" + trip.id;
            let tab = GM_openInTab(tripUrl, {active: false, insert: true});
            if (tab) {
                tripTabs.push(tab);
            }
        });
        // also open up a garage page
        let garageUrl = "https://www.logitycoon.com/eu1/index.php?a=garage";
        let garageTab = GM_openInTab(garageUrl, {active: false, insert: true});
        if (garageTab) {
            tripTabs.push(garageTab);
        }
        console.log("Opened trip pages:", tripTabs);
        // Set a timeout to close all opened trip pages after TRIP_WINDOW_DURATION.
        // After the set duration, close all the opened trip pages and refresh the dashboard.
        setTimeout(() => {
            tripTabs.forEach(tab => {
                if (tab && !tab.closed) {
                    tab.close();
                }
            });
            console.log("Closing trip pages and refreshing dashboard.");
            window.location.reload();
        }, TRIP_WINDOW_DURATION);
    }

    // --- Main Automation Loop (for the Warehouse/Dashboard page) ---
    function mainAutomationLoop() {
        // Retrieve available trips from the current warehouse page document.
        let availableTrips = WarehouseHelper.extractFreightInfo(document);
        console.log("Available trips on dashboard:", availableTrips);
        if (availableTrips.length < TRIP_THRESHOLD) {
            let cyclesNeeded = TRIP_THRESHOLD - availableTrips.length;
            console.log(`Not enough trips. Simulating ${cyclesNeeded} additional cycle(s).`);
            // Simulate visiting the trips page for the needed number of cycles.
            simulateTripsCycle(cyclesNeeded).then(() => {
                // Reload the current page to update the available trips.
                window.location.reload();
            });
        } else {
            // Open each trip page in a new tab.
            openTripPages(availableTrips);
        }
    }

    // --- Main Entry ---
    const currentURL = window.location.href;
    if (currentURL.indexOf("a=warehouse") !== -1) {
        console.log("Dashboard (Warehouse) page detected. Starting automation loop.");

        window.addEventListener("load", () => {
            mainAutomationLoop();
        });
    } else if (currentURL.indexOf("a=trips") !== -1) {
        console.log("Trips page detected. Initializing TripsHelper.");
        TripsHelper.initTrips();
    } else if (currentURL.indexOf("a=freight") !== -1) {
        console.log("Freight detail page detected.");
        const freightDetails = FreightHelper.extractFreightDetail(document);
        console.log("Freight details:", freightDetails);
        // Execute any additional freight action button presses.
        FreightHelper.pressFreightActionButtons();
    }
})();
