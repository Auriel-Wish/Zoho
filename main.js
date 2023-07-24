var axios = require('axios');
var readlineSync = require('readline-sync');
var XLSX = require('xlsx');
var tokenFuncs = require('./accessToken');
var config = require('./config');

var headers = { Authorization:0, orgId:0 };

// If original Tokens are needed again
// tokenFuncs.createOriginalTokens();

// test dept
var departmentId;

var assigneeIDs = [];
var agents = {};
var agentsDummy = {};
var unassignedTickets = [];
var priorityQueue = [];
var groupedPriority = [];
var allTickets = [];

var wbName = 'zoho.xlsx';
var wb = XLSX.readFile(wbName);
var sheet = wb.Sheets['Main'];

// Driver function
async function main() {
    // First get the API access token
    await tokenFuncs.getAccessToken()
        .then(accessToken => {
            headers = {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                orgId: config.orgID,
            };

            // Get all the agents working for Modix
            let urlAgents = 'https://desk.zoho.com/api/v1/agents';
            return axios.get(urlAgents, { headers });
        })
        .then(response => {
            // Each agent goes into the "Agents" object
            // The key is their Zoho ID
            // shortID is an easier way to refer to them - it is designated when
            // the function runs
            let id = 0;
            for (let i = 0; i < response.data.data.length; i++) {
                let newAgent = {
                    name: response.data.data[i].name,
                    shortID: id,
                    numTickets: 0,
                    numWaiting: 0,
                    maxTickets: 0,
                    maxWaiting: 0
                };

                // Leave out these people/entities - they don't get tickets but they are in Zoho
                if (newAgent.name != 'Customer Service' && newAgent.name != 'Shachar  Gafni' && newAgent.name != 'Shachar Gafni') {
                    agents[response.data.data[i].id] = newAgent;
                    id++;
                }
            }
            
            // Order the agents
            createPriorityQueue(agents);
        })
        .catch(error => {
            console.error(error);
        })
        .then(() => {
            setDepartmentID();
        })
        // Count the number of tickets per agent
        .then(async () => {
            // Retrieve all the tickets in Zoho
            await getAllTickets(0);
            for (let i = 0; i < allTickets.length; i++) {
                // It only matters if it is open
                if (allTickets[i].statusType == "Open" || allTickets[i].statusType == "On Hold") {
                    // If the ticket is unnassigned, assign it later
                    // If it is assigned, document which agent is responsible for it
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
        })
        .then(() => {
            // Desginate all the unassigned tickets
            for (let i = 0; i < unassignedTickets.length; i++) {
                placeTicket(unassignedTickets[i]);
            }

            // Print (in Excel) how many tickets were assigned to each person
            sayNumTickets();
        });
}

// Gets all tickets in the given department
// This is a recursive function that runs until the API returns no more tickets
// This is necessary because the API can only return 100 tickets at a time
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

// Assign the ticket to the agent in Zoho
function placeTicket(ticket) {    
    let ticketAllocated = false;
    
    // Ticket will get assigned unless no agent has room for it
    while (priorityQueue.length > 0 && !ticketAllocated) {
        for (const [id, agent] of Object.entries(agents)) {
            // Check if the queue is still priority-based
            if (priorityQueue[0] == groupedPriority && groupedPriority[0] == agent.shortID) {
                if (agent.numTickets < agent.maxTickets && agent.numWaiting < agent.maxWaiting) {
                    // Assign tickets equally to everyone left
                    assignTicket(id, ticket, agent);
                    groupedPriority.push(groupedPriority[0]);
                    groupedPriority.shift();
                    ticketAllocated = true;
                    break;
                }
                else {
                    groupedPriority.shift();
                }
                if (groupedPriority.length == 0) {
                    priorityQueue.shift();
                }
            }
            else {
                // Assign the ticket to the first agent on the queue
                if (agent.shortID == priorityQueue[0]) {
                    // Assign it to them as long as they have space
                    if (agent.numTickets < agent.maxTickets && agent.numWaiting < agent.maxWaiting) {                    
                        assignTicket(id, ticket, agent);
                        ticketAllocated = true;
                        break;
                    }
                    // If the agent has no space for more tickets, remove them from the queue
                    else {
                        priorityQueue.shift();
                    }
                }
            }
        }
    }
}

// API call to assign the ticket
function assignTicket(id, ticket, agent) {
    let ticketData = {
        assigneeId: id
    };

    let subject = ticket.subject;
    console.log(`Assigning ticket to ${agent.name}`);
    console.log(`Subject: ${subject}\n`);

    // Assign the ticket
    updateTicketUrl = `https://desk.zoho.com/api/v1/tickets/${ticket.id}`;
    axios.patch(updateTicketUrl, ticketData, { headers })
        .then(() => {})
        .catch(error => {
            console.error(error);
        });

    // Document that the ticket has been assigned
    agent.numTickets++;
    if (ticket.status.toLowerCase() == 'waiting on us') {
        agent.numWaiting++;
    }
}

// Display (in Excel) the number of tickets delegated to each agent
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
                sheet[`G${i + 1}`] = newCell;
            }
        }
    }

    XLSX.writeFile(wb, wbName);
}

// Make the queue that controls which agent gets the ticket
function createPriorityQueue() {
    let x = 0;
    let newCell;
    let restartProgram = false;
    // Write in all of the agents and their IDs (in case there has been an update
    // to the agents)
    Object.keys(agents).forEach(function(id, agent) {
        // 2 different ways of updating cells
        // Necessary because inserting a non-existent cell is different
        // than editing an existing cell
        
        // Cell with name
        let cellRef = XLSX.utils.encode_cell({c: 0, r: x + 1});
        let cell = sheet[cellRef];
        if (cell) {
            // update existing cell
            cell.v = agents[id].name;
        } else {
            // add new cell
            XLSX.utils.sheet_add_aoa(sheet, [[agents[id].name]], {origin: cellRef});
            restartProgram = true;
            console.log(`A new agent has been added: ${agents[id].name}\nPlease fill in the necessary cells and run again.`);
        }

        // Cell with ID
        newCell = {
            v: agents[id].shortID,
            t: 'n'
        }
        sheet[`B${x + 2}`] = newCell;
        x++;
    });

    XLSX.writeFile(wb, wbName);

    // Error checking
    if (restartProgram) {
        process.exit(1);
    }
    checkOrderedIDs();

    // Read in the agent ticket limitations and assign it to the agents
    let data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let currData;
    let maxTickets;
    let maxWaiting;
    let currID;
    let hasPriority;
    for (let i = 1; i < data.length; i++) {
        currData = data[i];
        currID = currData[2];
        hasPriority = currData[3];
        maxTickets = currData[4];
        maxWaiting = currData[5];

        for (const [id, agent] of Object.entries(agents)) {
            if (agent.shortID == currID) {
                agent.maxTickets = maxTickets;
                agent.maxWaiting = maxWaiting;
            }
        }

        // Check if priority is relevant for the current agent
        if (hasPriority.toLowerCase() == 'f') {
            groupedPriority.push(currID);
        }
        else if (hasPriority.toLowerCase() == 't') {
            priorityQueue.push(currID);
        }
        else {
            console.log('One or more of the "Priority On/Off" letters is not "t" or "f"');
            process.exit(1);
        }
    }

    // At the end of the priority queue comes all of the people that will get
    // tickets distrubuted equally
    priorityQueue.push(groupedPriority);
}

// Check to make sure all IDs are used exactly once
function checkOrderedIDs() {
    let IDsUsedCorrectly = true;
    
    let data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let currData;
    let IDs1 = [];
    let IDs2 = [];
    for (let i = 1; i < data.length; i++) {
        currData = data[i];
        IDs1.push(parseInt(currData[1]));
        IDs2.push(parseInt(currData[2]));
    }

    if (IDs1.length != IDs2.length) {
        IDsUsedCorrectly = false;
    }

    IDs1.sort();
    IDs2.sort();
    for (let i = 0; i < IDs1.length; i++) {
        if (IDs1[i] != IDs2[i]) {
            IDsUsedCorrectly = false;
        }
    }

    if (!IDsUsedCorrectly) {
        console.log("You did not use every ID exactly once. Please check columns B and C.");
        process.exit(1);
    }
}

// Get the department ID from the Excel sheet
function setDepartmentID() {
    let data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    departmentId = data[1][10];

    if (departmentId == null) {
        console.log("Invalid department ID");
        process.exit(1);
    }
}

main();