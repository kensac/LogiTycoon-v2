// ==UserScript==
// @name         WarehouseHelper.js
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Warehouse Automation Helper Module.
// @match        https://www.logitycoon.com/eu1/index.php?a=warehouse*
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// ==/UserScript==

/**
 * @file WarehouseHelper.js
 *
 * @description
 *  Warehouse Automation Helper Module.
 *
 * @function fetchWarehousePage() : void - Fetches the Warehouse page and extracts freight info.
 * @function extractFreightInfo(doc: Document) : Freight[] - Extracts freight information from the Warehouse page.
 *
 * @typedef {Object} Freight
 * @property {string} id
 * @property {number} earnings
 * @property {string} departure
 * @property {string} destination
 * @property {string} distance
 * @property {string} tripType
 */

const WarehouseHelper = (function() {
    const config = {
        baseUrl: "https://www.logitycoon.com/eu1/",
        endpoints: {
            warehousePage: "index.php?a=warehouse"
        }
    };

    function fetchWarehousePage() {
        const url = config.baseUrl + config.endpoints.warehousePage;
        console.log("WarehouseHelper: Fetching warehouse page from", url);
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload(response) {
                const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                const freightInfo = extractFreightInfo(doc);
                console.log("WarehouseHelper: Extracted freight info:", freightInfo);
            },
            onerror(err) {
                console.error("WarehouseHelper: Error fetching warehouse page:", err);
            }
        });
    }

    function extractFreightInfo(doc) {
        const freights = [];
        const tbody = doc.querySelector("tbody#tbody-available");
        if (!tbody) {
            console.warn("WarehouseHelper: Freight table (tbody#tbody-available) not found.");
            return freights;
        }
        tbody.querySelectorAll("tr").forEach(row => {
            const freight = {};
            const cells = Array.from(row.children);
            const idCell = cells.find(cell => cell.classList.contains("hidden-xs") && cell.textContent.trim().startsWith("#"));
            if (idCell) {
                freight.id = idCell.textContent.trim().replace("#", "");
            }
            if (cells[1]) {
                let earningsText = cells[1].textContent.trim().replace(/[\$,]/g, "");
                freight.earnings = parseFloat(earningsText);
            }
            const visibleCells = cells.filter(cell => cell.classList.contains("visible-sm"));
            if (visibleCells.length > 0) {
                const departureCell = visibleCells[0];
                const depImg = departureCell.querySelector("img");
                if (depImg) depImg.remove();
                freight.departure = departureCell.textContent.trim();
            }
            if (visibleCells.length > 1) {
                const destinationCell = visibleCells[1];
                const destImg = destinationCell.querySelector("img");
                if (destImg) destImg.remove();
                freight.destination = destinationCell.textContent.trim();
            }
            const distanceCell = cells.find(cell => cell.textContent.trim().endsWith("km"));
            if (distanceCell) {
                freight.distance = distanceCell.textContent.trim();
            }
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

    return {
        fetchWarehousePage,
        extractFreightInfo
    };
})();
