const axios = require('axios');
const getAccessToken = require('./accessToken');
var headers = {Authorization:0, orgId:0};

getAccessToken()
    .then(accessToken => {
        let urlTickets = 'https://desk.zoho.com/api/v1/tickets';
        // const url = 'https://desk.zoho.com/api/v1/agents';
        headers = {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            orgId: '807931464',
        };

        return axios.get(urlTickets, { headers });
    })
    .then(response => {
        // for (let i = 0; i < response.data.data.length; i++) {
        //     console.log(response.data.data[i].assigneeId);
        // }
    })
    .then(accessToken => {
        const urlAgents = 'https://desk.zoho.com/api/v1/agents';

        return axios.get(urlAgents, { headers });
    })
    .then(response => {
        console.log(response.data);
    })
    .catch(error => {
        console.error('ERROR:\n' + error.response.data.errorCode + '\n' + error.response.data.message);
        // Handle any errors that occur during the request
    });