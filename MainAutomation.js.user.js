// ==UserScript==
// @name         MainAutomation.js
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Main file that integrates Trips and Warehouse automation helpers. It also prints freight details when on a freight page.
// @match        https://www.logitycoon.com/eu1/index.php?a=trips*
// @match        https://www.logitycoon.com/eu1/index.php?a=warehouse*
// @match        https://www.logitycoon.com/eu1/index.php?a=freight*
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// @resource      TripsHelper.js
// @resource      WarehouseHelper.js
// @resource      FreightHelper.js
// ==/UserScript==

/**
 * @file MainAutomation.js
 *
 * @description
 *  Main file that integrates Trips and Warehouse automation helpers.
 *
 * @function init() : void - Determines which page is loaded and calls the corresponding helper.
 */

(function() {
    'use strict';

    const currentURL = window.location.href;
    if (currentURL.indexOf("a=trips") !== -1) {
        TripsHelper.initTrips();
    } else if (currentURL.indexOf("a=warehouse") !== -1) {
        WarehouseHelper.fetchWarehousePage();
    } else if (currentURL.indexOf("a=freight") !== -1) {
        console.log("MainAutomation: Freight detail page detected.");
        // Use the FreightHelper to extract and print freight details.
        // It is assumed that FreightHelper.extractFreightDetail(document) is defined in a helper file.
        const freightDetails = FreightHelper.extractFreightDetail(document);
        console.log("Freight details:", freightDetails);
    }
})();
