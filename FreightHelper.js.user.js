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
 * @function pressFreightActionButtons() : void - Clicks any button with text "drive" first, then clicks the first button with text "load", "drive", "unload", and "finish".
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
        const detailsPortlet = Array.from(doc.querySelectorAll("div.portlet")).find(el =>
            el.textContent.includes("Freight Details")
        );
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

        // Extract financial overview from the "Financial Overview" portlet.
        const finPortlet = Array.from(doc.querySelectorAll("div.portlet")).find(el =>
            el.textContent.includes("Financial Overview")
        );
        const financialOverview = [];
        if (finPortlet) {
            const finTable = finPortlet.querySelector("table.table-bordered");
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
        }
        freightDetail.financialOverview = financialOverview;

        // Extract button functionalities.
        const buttons = {};
        // Use jQuery to find any button or link that appears to trigger a freight action.
        // This is a general approach; adjust selectors as necessary.
        buttons.actions = [];
        const actionElements = $("button, a").filter(function() {
            const txt = $(this).text().trim().toLowerCase();
            return txt.includes("freight") || txt.includes("load") || txt.includes("drive") || txt.includes("unload") || txt.includes("finish");
        });
        actionElements.each(function() {
            buttons.actions.push({
                tag: this.tagName,
                text: $(this).text().trim(),
                onclick: $(this).attr("onclick") || null,
                href: $(this).attr("href") || null
            });
        });
        freightDetail.buttons = buttons;

        return freightDetail;
    }

    /**
     * Presses any button with text "drive" first, then presses the first button whose text is
     * one of "load", "drive", "unload", or "finish".
     */
    function pressFreightActionButtons() {
        // First, press a button with text "drive" (case-insensitive).
        const driveButton = $("button, a").filter(function() {
            return $(this).text().trim().toLowerCase() === "drive";
        }).first();
        if (driveButton.length > 0) {
            console.log("Pressing 'Drive' button");
            driveButton.click();
        } else {
            console.log("No 'Drive' button found.");
        }

        // Then, iterate over the list of actions.
        const actions = ["load", "drive", "unload", "finish"];
        actions.forEach(action => {
            const btn = $("button, a").filter(function() {
                return $(this).text().trim().toLowerCase() === action;
            }).first();
            if (btn.length > 0) {
                console.log("Pressing '" + action + "' button");
                btn.click();
            } else {
                console.log("No '" + action + "' button found.");
            }
        });
    }

    return {
        extractFreightDetail,
        pressFreightActionButtons
    };
})();
