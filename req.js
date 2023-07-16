var axios = require('axios');
const readlineSync = require('readline-sync');
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

            agents = createPriorityQueue(agents);
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
                console.log(agent)
                if (agent.numTickets < agent.maxTickets && agent.numWaiting < agent.maxWaiting) {
                    console.log(`Assigning ticket to ${agent.name}`);
                    
                    // assign ticket
                    let ticketData = {
                        assigneeId: id
                    };

                    let subject = ticket.subject;
                    console.log(`Subject: ${subject}\n`);

                    updateTicketUrl = `https://desk.zoho.com/api/v1/tickets/${ticket.id}`;
                    axios.patch(updateTicketUrl, ticketData, { headers })
                        .then(() => {})
                        .catch(error => {
                            console.error('ERROR:\n' + error.response.data.errorCode + '\n' + error.response.data.message);
                        });

                    agent.numTickets++;
                    if (ticket.status.toLowerCase() == 'waiting on us') {
                        agent.numWaiting++;
                    }
                    ticketAllocated = true;
                }
                else {
                    priorityQueue.shift();
                    console.log(priorityQueue);
                }
            }
        }
    }
}

function createPriorityQueue(agents) {
    for (count = 0; count < (Object.keys(agents).length + Object.keys(agentsDummy).length); count++) {
        console.log(`\nSelect the ${count} agent:`);
        for (const [id, agent] of Object.entries(agents)) {
            console.log(`\t${agent.shortID}: ${agent.name}`)
        }

        let nextNum = readlineSync.question();
        nextNum = parseInt(nextNum);
        priorityQueue.push(nextNum);

        console.log(`\nMaximum total tickets for this agent (Or, type 'e' to exclude this agent): `);
        let maxTickets = readlineSync.question();
        let maxWaiting;
        if (maxTickets != 'e') {
            maxTickets = parseInt(maxTickets);

            console.log(`\nMaximum "Waiting On Us" tickets for this agent: `);
            maxWaiting = readlineSync.question();
            maxWaiting = parseInt(maxWaiting);
        }
        else {
            maxTickets = 0;
            maxWaiting = 0;
        }

        for (const [id, agent] of Object.entries(agents)) {
            if (agent.shortID == nextNum) {
                agent.maxTickets = maxTickets;
                agent.maxWaiting = maxWaiting;
                agentsDummy[id] = agent;
                delete agents[id];
            }
        }
    }

    return agentsDummy;
}

main();