const axios = require('axios');
const tokenFuncs = require('./accessToken');
const config = require('./config');
var headers = {Authorization:0, orgId:0};

// tokenFuncs.createOriginalTokens();
var assigneeIDs = [];
var agentIDs = {};

tokenFuncs.getAccessToken()
    .then(accessToken => {
        let urlTickets = 'https://desk.zoho.com/api/v1/tickets';
        headers = {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            orgId: config.orgID,
        };

        return axios.get(urlTickets, { headers });
    })
    .then(response => {
        for (let i = 0; i < response.data.data.length; i++) {
            // console.log(response.data.data[i].assigneeId);
            assigneeIDs.push(response.data.data[i].assigneeId);
        }
    })
    .then(() => {
        let urlAgents = 'https://desk.zoho.com/api/v1/agents';
        return axios.get(urlAgents, { headers });
    })
    .then(response => {
        // console.log(response.data);
        for (let i = 0; i < response.data.data.length; i++) {
            // console.log(response.data.data[i].id);
            let newAgent = {name: response.data.data[i].name, shortID:i, numTickets: 0};
            agentIDs[response.data.data[i].id] = newAgent;
        }
    })
    .catch(error => {
        console.error('ERROR:\n' + error.response.data.errorCode + '\n' + error.response.data.message);
    })
    .then(() => {
        for (let i = 0; i < assigneeIDs.length; i++) {
            if (assigneeIDs[i] in agentIDs) {
                // console.log(`MATCH: ${assigneeIDs[i]}`);
                (agentIDs[assigneeIDs[i]]).numTickets++;
            }
        }
        console.log(agentIDs);
        
        // console.log('Agent IDs: ' + agentIDs);
        // console.log('Assignee IDs: ' + assigneeIDs);
    })