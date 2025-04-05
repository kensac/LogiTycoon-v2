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
 * @property {Object} [buttons] - Contains an array of action buttons with their text and action attributes.
 */
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
    // Find the portlet that includes "Freight Details" in its text.
    let detailsPortlet = Array.from(doc.querySelectorAll("div.portlet")).find(el =>
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
    let finPortlet = Array.from(doc.querySelectorAll("div.portlet")).find(el =>
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

    // Extract button functionalities by searching for elements with freight action attributes.
    // We search for any element (button or link) with an onclick attribute containing "freight" or an href containing "freight".
    const buttons = { actions: [] };
    const actionElements = doc.querySelectorAll("[onclick*='freight'], a[href*='freight']");
    actionElements.forEach(el => {
        buttons.actions.push({
            tag: el.tagName,
            text: el.textContent.trim(),
            onclick: el.getAttribute("onclick") || null,
            href: el.getAttribute("href") || null
        });
    });
    freightDetail.buttons = buttons;

    return freightDetail;
}
