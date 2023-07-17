var axios = require('axios');
var readlineSync = require('readline-sync');
var XLSX = require('xlsx');
var tokenFuncs = require('./accessToken');
var config = require('./config');

var headers = { Authorization:0, orgId:0 };

// If original Tokens are needed again
// tokenFuncs.createOriginalTokens();

// test dept
var departmentId = '846378000000705029';

// modix dept
// var departmentId = '846378000000006907';

var assigneeIDs = [];
var agents = {};
var agentsDummy = {};
var unassignedTickets = [];
var priorityQueue = [];
var allTickets = [];

var wbName = 'zoho.xlsx';
var wb = XLSX.readFile(wbName);
var sheetName = wb.SheetNames[0];
var sheet = wb.Sheets[sheetName];

async function main() {
    await tokenFuncs.getAccessToken()
        .then(accessToken => {
            headers = {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                orgId: config.orgID,
            };

            let urlAgents = 'https://desk.zoho.com/api/v1/agents';
            return axios.get(urlAgents, { headers });
        })
        .then(response => {
            for (let i = 0; i < response.data.data.length; i++) {
                let newAgent = {name: response.data.data[i].name, shortID:i, numTickets: 0, numWaiting: 0, maxTickets: 0, maxWaiting: 0};
                agents[response.data.data[i].id] = newAgent;
            }

            createPriorityQueue(agents);
        })
        .catch(error => {
            console.error(error);
        })
        // Count the number of tickets per agent
        .then(async () => {
            await getAllTickets(0);
            for (let i = 0; i < allTickets.length; i++) {
                if (allTickets[i].statusType == "Open") {
                    if (allTickets[i].assigneeId == null) {
                        unassignedTickets.push(allTickets[i]);
                    }
                    else {
                        agents[allTickets[i].assigneeId].numTickets++;
                        if (allTickets[i].status.toLowerCase() == 'waiting on us') {
                            (agents[allTickets[i].assigneeId]).numWaiting++;
                        }
                    }
                }
            }

            console.log('Unassigned Tickets: ' + unassignedTickets.length);
        })
        .then(() => {
            // console.log(agents);
            for (let i = 0; i < unassignedTickets.length; i++) {
                placeTicket(unassignedTickets[i]);
            }

            sayNumTickets();
        });
}

function getAllTickets(from) {
    let urlTickets = `https://desk.zoho.com/api/v1/tickets?departmentId=${departmentId}&limit=100&from=${from}`;
    return axios.get(urlTickets, { headers })
        .then(async (response) => {
            if (response.data != '') {
                allTickets = allTickets.concat(response.data.data);
                await getAllTickets(from + 100);
            }
        })
}

function placeTicket(ticket) {    
    let ticketAllocated = false;
    
    while (priorityQueue.length > 0 && !ticketAllocated) {
        for (const [id, agent] of Object.entries(agents)) {
            if (agent.shortID == priorityQueue[0]) {
                if (agent.numTickets < agent.maxTickets && agent.numWaiting < agent.maxWaiting) {
                    console.log(`Assigning ticket to ${agent.name}`);
                    
                    // assign ticket
                    let ticketData = {
                        assigneeId: id
                    };

                    let subject = ticket.subject;
                    console.log(`Subject: ${subject}\n`);

                    // updateTicketUrl = `https://desk.zoho.com/api/v1/tickets/${ticket.id}`;
                    // axios.patch(updateTicketUrl, ticketData, { headers })
                    //     .then(() => {})
                    //     .catch(error => {
                    //         console.error('ERROR:\n' + error.response.data.errorCode + '\n' + error.response.data.message);
                    //     });

                    agent.numTickets++;
                    if (ticket.status.toLowerCase() == 'waiting on us') {
                        agent.numWaiting++;
                    }
                    ticketAllocated = true;
                }
                else {
                    priorityQueue.shift();
                }
            }
        }
    }
}

function sayNumTickets() {
    let data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let currData;
    let currID;
    let newCell;
    for (let i = 1; i < data.length; i++) {
        currData = data[i];
        currID = currData[1];

        for (const [id, agent] of Object.entries(agents)) {
            if (agent.shortID == currID) {
                newCell = {
                    t: 'n',
                    v: agent.numTickets
                }
                sheet[`F${i + 1}`] = newCell;
            }
        }
    }

    XLSX.writeFile(wb, wbName);
}

function createPriorityQueue() {
    let x = 0;
    let newCell;
    Object.keys(agents).forEach(function(id, agent) {
        newCell = {
            t: 's',
            v: agents[id].name
        }
        sheet[`A${x + 2}`] = newCell;
        newCell = {
            t: 'n',
            v: agents[id].shortID
        }
        sheet[`B${x + 2}`] = newCell;
        x++;
    });
    XLSX.writeFile(wb, wbName);

    let data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let currData;
    let maxTickets;
    let maxWaiting;
    let currID;
    for (let i = 1; i < data.length; i++) {
        currData = data[i];
        currID = currData[2];
        maxTickets = currData[3];
        maxWaiting = currData[4];

        for (const [id, agent] of Object.entries(agents)) {
            if (agent.shortID == currID) {
                agent.maxTickets = maxTickets;
                agent.maxWaiting = maxWaiting;
            }
        }

        priorityQueue.push(currID);
    }
}

main();