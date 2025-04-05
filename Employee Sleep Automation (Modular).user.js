// ==UserScript==
// @name         Employee Sleep Automation (Modular)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Modular script to fetch employee data (Truckers and Warehouse Employees) and trigger sleep actions if conditions are met.
// @match        https://www.logitycoon.com/eu1/*
// @grant        GM_xmlhttpRequest
// @connect      www.logitycoon.com
// ==/UserScript==

(function() {
    'use strict';

    const EmployeeAutomation = {
        // Configurable settings and endpoints
        config: {
            baseUrl: "https://www.logitycoon.com/eu1/",
            endpoints: {
                employeesPage: "index.php?a=employees",
                employeeDetail: "index.php?a=employees_select&e=",
                employeeSleep: "ajax/employee_sleep.php?e="
            },
            // Mapping table types to the index of data columns in each row
            tableMappings: {
                "Truckers": {
                    salary: 2,
                    location: 3,
                    sleep: 4,
                    idCard: 5,
                    action: 6,
                    available: 7,
                    pallet: 8
                },
                "Warehouse Employees": {
                    salary: 2,
                    location: 3,
                    sleep: 4,
                    action: 5,
                    available: 6,
                    pallet: 7
                }
            }
        },

        // Entry point to start processing
        init() {
            this.fetchEmployeesPage();
        },

        // Generic GET request wrapper that returns a Promise
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

        // Fetch the employees page and begin extraction and processing
        fetchEmployeesPage() {
            const url = this.config.baseUrl + this.config.endpoints.employeesPage;
            this.sendRequest(url)
                .then(response => {
                    const doc = new DOMParser().parseFromString(response.responseText, "text/html");
                    const employees = this.extractEmployees(doc);
                    console.log("Extracted employees:", employees);
                    employees.forEach(emp => this.processEmployee(emp));
                })
                .catch(err => {
                    console.error("Error fetching employees page:", err);
                });
        },

        // Extract employee data from portlets that contain employee tables.
        // It uses tableMappings to pick the right columns based on the table title.
        extractEmployees(doc) {
            const employees = [];
            const portlets = doc.querySelectorAll("div.portlet.light.bordered");

            portlets.forEach(portlet => {
                const captionEl = portlet.querySelector("div.portlet-title .caption .caption-subject");
                if (!captionEl) return;
                const title = captionEl.textContent.trim();
                let mappingKey = null;
                if (title.includes("Truckers")) {
                    mappingKey = "Truckers";
                } else if (title.includes("Warehouse Employees")) {
                    mappingKey = "Warehouse Employees";
                }
                if (!mappingKey) return;
                const mapping = this.config.tableMappings[mappingKey];
                const rows = portlet.querySelectorAll("table.table tbody tr");

                rows.forEach(row => {
                    const link = row.querySelector("a[href*='index.php?a=employees_select&e=']");
                    if (link) {
                        const href = link.getAttribute("href");
                        const idMatch = href.match(/e=(\d+)/);
                        if (idMatch && idMatch[1]) {
                            const employee = {
                                id: idMatch[1],
                                name: link.textContent.trim()
                            };
                            const cells = row.querySelectorAll("td");
                            employee.salary   = cells[mapping.salary]   ? cells[mapping.salary].textContent.trim() : "";
                            employee.location = cells[mapping.location] ? cells[mapping.location].textContent.trim() : "";
                            employee.sleep    = cells[mapping.sleep]    ? cells[mapping.sleep].textContent.trim() : "";
                            // Only truckers have an idCard column
                            if (mapping.idCard !== undefined) {
                                employee.idCard = cells[mapping.idCard] ? cells[mapping.idCard].textContent.trim() : "";
                            }
                            employee.action   = cells[mapping.action]   ? cells[mapping.action].textContent.trim() : "";
                            employee.available= cells[mapping.available]? cells[mapping.available].textContent.trim() : "";
                            employee.pallet   = cells[mapping.pallet]   ? cells[mapping.pallet].textContent.trim() : "";
                            employees.push(employee);
                        }
                    }
                });
            });
            return employees;
        },

        // Process an individual employee: if they're idle ("Nothing") and not at 100% sleep,
        // load their detail page then trigger the sleep command.
        processEmployee(employee) {
            const sleepPercent = parseInt(employee.sleep.replace('%', '').trim(), 10);
            if (employee.action === "Nothing" && sleepPercent < 100) {
                console.log(`Employee ${employee.id} qualifies for sleep (Sleep: ${sleepPercent}%).`);
                const detailUrl = this.config.baseUrl + this.config.endpoints.employeeDetail + employee.id;
                this.sendRequest(detailUrl)
                    .then(() => {
                        console.log(`Loaded detail page for employee ${employee.id}.`);
                        const sleepUrl = this.config.baseUrl + this.config.endpoints.employeeSleep + employee.id;
                        return this.sendRequest(sleepUrl);
                    })
                    .then(sleepResp => {
                        console.log(`Sleep command response for employee ${employee.id}:`, sleepResp.responseText);
                    })
                    .catch(err => {
                        console.error(`Error processing employee ${employee.id}:`, err);
                    });
            } else {
                console.log(`Employee ${employee.id} skipped (Action: ${employee.action}, Sleep: ${employee.sleep}).`);
            }
        }
    };

    // Initialize the module
    EmployeeAutomation.init();
})();
