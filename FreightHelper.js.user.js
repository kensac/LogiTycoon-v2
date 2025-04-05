// ==UserScript==
// @name         FreightHelper.js
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Freight Automation Helper Module.
// @match        https://www.logitycoon.com/eu1/index.php?a=freight*
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// ==/UserScript==

/**
 * @file FreightHelper.js
 *
 * @description
 *  Freight Automation Helper Module.
 *
 * @function extractFreightDetail(doc: Document) : FreightDetail - Extracts all information from a freight detail page, including button actions.
 *
 * @typedef {Object} FreightDetail
 * @property {string} [id] - Freight identifier.
 * @property {Object} [details] - Key-value pairs of freight details.
 * @property {Object[]} [financialOverview] - Array of financial overview items.
 * @property {Object} [buttons] - Button info, where each key corresponds to a freight action.
 */

const FreightHelper = (function() {

    function extractFreightDetail(doc) {
        const freightDetail = {};

        // Extract freight id from the page title (e.g., "Freight #919")
        const titleEl = doc.querySelector("h1.page-title");
        if (titleEl) {
            const idMatch = titleEl.textContent.match(/#(\d+)/);
            if (idMatch) {
                freightDetail.id = idMatch[1];
            }
        }

        // Extract freight details from the "Freight Details" portlet.
        const detailsPortlet = doc.querySelector("div.portlet.grey-salsa.box");
        const details = {};
        if (detailsPortlet) {
            detailsPortlet.querySelectorAll("div.row.static-info").forEach(row => {
                const nameEl = row.querySelector("div.name");
                const valueEl = row.querySelector("div.value");
                if (nameEl && valueEl) {
                    const label = nameEl.textContent.replace(/[\n\r]+/g, " ").trim().replace(":", "");
                    const value = valueEl.textContent.replace(/[\n\r]+/g, " ").trim();
                    details[label] = value;
                }
            });
        }
        freightDetail.details = details;

        // Extract financial overview from the "Financial Overview" table.
        const financialOverview = [];
        const finTable = doc.querySelector("div.portlet.grey-cascade.box table.table-bordered");
        if (finTable) {
            finTable.querySelectorAll("tbody tr").forEach(row => {
                const cells = row.querySelectorAll("td");
                if (cells.length >= 5) {
                    financialOverview.push({
                        label: cells[0].textContent.trim(),
                        status: cells[1].textContent.trim(),
                        grossPrice: cells[2].textContent.trim(),
                        quantity: cells[3].textContent.trim(),
                        netTotal: cells[4].textContent.trim()
                    });
                }
            });
        }
        freightDetail.financialOverview = financialOverview;

        // Extract button functionalities.
        const buttons = {};
        const loadBtn = doc.querySelector("button#712851");
        if (loadBtn) {
            buttons.load = {
                text: loadBtn.textContent.trim(),
                onclick: loadBtn.getAttribute("onclick")
            };
        }
        const cancelBtn = doc.querySelector("a[title^='Cancel Freight']");
        if (cancelBtn) {
            buttons.cancel = {
                text: cancelBtn.textContent.trim(),
                onclick: cancelBtn.getAttribute("data-successjs") || cancelBtn.getAttribute("onclick")
            };
        }
        const empBtn = doc.querySelector("button[onclick*='freightautowhemployee853399']");
        if (empBtn) {
            buttons.employee = {
                text: empBtn.textContent.trim(),
                onclick: empBtn.getAttribute("onclick")
            };
        }
        const truckBtn = doc.querySelector("a[href*='freight_truck&n=']");
        if (truckBtn) {
            buttons.truck = {
                text: truckBtn.textContent.trim(),
                href: truckBtn.getAttribute("href")
            };
        }
        const trailerBtn = doc.querySelector("a[href*='freight_trailer&n=']");
        if (trailerBtn) {
            buttons.trailer = {
                text: trailerBtn.textContent.trim(),
                href: trailerBtn.getAttribute("href")
            };
        }
        const speedupBtn = doc.querySelector("button[onclick*='freightspeedup']");
        if (speedupBtn) {
            buttons.speedup = {
                text: speedupBtn.textContent.trim(),
                onclick: speedupBtn.getAttribute("onclick")
            };
        }
        freightDetail.buttons = buttons;

        return freightDetail;
    }

    return {
        extractFreightDetail
    };
})();
