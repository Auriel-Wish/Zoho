var axios = require('axios');
var tokenFuncs = require('./accessToken');
var config = require('./config');

var headers = {Authorization:0, orgId:0};

// If original Tokens are needed again
// tokenFuncs.createOriginalTokens();

var assigneeIDs = [];
var agents = {};
var unassignedTickets = [];
var priorityQueue = [3, 2, 1, 5, 4, 0, 6];


function main() {
    tokenFuncs.getAccessToken()
    // Get all the tickets    
    .then(accessToken => {
            // Modix department ID
            // let departmentId = '846378000000006907';

            // test department ID
            let departmentId = '846378000000705029';

            let urlTickets = `https://desk.zoho.com/api/v1/tickets?departmentId=${departmentId}&limit=100&assignee=Unassigned`;
            headers = {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                orgId: config.orgID,
            };

            return axios.get(urlTickets, { headers });
        })
        .then(response => {
            if (response.data.data.length == 0) {
                process.exit(0); 
            }
            for (let i = 0; i < response.data.data.length; i++) {                
                assigneeIDs.push(response.data.data[i].assigneeId);
                if (assigneeIDs[i] == null && response.data.data[i].statusType == 'Open') {
                    unassignedTickets.push(response.data.data[i]);
                    // console.log(response.data.data[i]);
                }
            }
        })
        // Get all the agents
        .then(() => {
            let urlAgents = 'https://desk.zoho.com/api/v1/agents';
            return axios.get(urlAgents, { headers });
        })
        .then(response => {
            for (let i = 0; i < response.data.data.length; i++) {
                let newAgent = {name: response.data.data[i].name, shortID:i, numTickets: 0, maxTickets: 10 - i};
                agents[response.data.data[i].id] = newAgent;
            }
            // console.log(agents);
        })
        .catch(error => {
            console.error('ERROR:\n' + error.response.data.errorCode + '\n' + error.response.data.message);
        })
        // Count the number of tickets per agent
        .then(() => {
            for (let i = 0; i < assigneeIDs.length; i++) {
                if (assigneeIDs[i] in agents) {
                    (agents[assigneeIDs[i]]).numTickets++;
                }
            }
        })
        .then(() => {
            for (let i = 0; i < unassignedTickets.length; i++) {
                placeTicket(unassignedTickets[i]);
            }
        })
    
        // Keep looping until all tickets have been assigned. This is necessary
        // because the API can only fetch 100 tickets at a time.
    // main();
}

function placeTicket(ticket) {    
    for (const [id, agent] of Object.entries(agents)) {
        if (agent.shortID == priorityQueue[0]) {
            if (agent.numTickets < agent.maxTickets) {
                console.log(`Assigining ticket to ${agent.name}: ${id}`);
                
                // assign ticket
                let ticketData = {
                    assigneeId: id
                };

                let subject = ticket.subject;
                console.log(`Subject: ${subject}\n`);
                if (subject != null) {
                    updateTicketUrl = `https://desk.zoho.com/api/v1/tickets/${ticket.id}`;
                    axios.patch(updateTicketUrl, ticketData, { headers })
                        .then(response => {
                            // console.log(response.data.assigneeId);
                        })
                        .catch(error => {
                            console.error('ERROR:\n' + error.response.data.errorCode + '\n' + error.response.data.message);
                        });
                }
            }
            else {
                priorityQueue.shift();
                if (priorityQueue.length > 0) {
                    // placeTicket(ticket);
                }
            }
        }
    }
}

main();

// total < 85 && waiting on us > 25
// option to exclude person from tickets