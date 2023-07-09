const axios = require('axios');
const getAccessToken = require('./accessToken');

getAccessToken()
    .then(accessToken => {
        // console.log(accessToken);
        const url = 'https://desk.zoho.com/api/v1/tickets';
        // const url = 'https://desk.zoho.com/api/v1/agents';
        const headers = {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            orgId: '807931464',
        };

        return axios.get(url, { headers });
    })
    .then(response => {
        for (let i = 0; i < response.data.data.length; i++) {
            console.log(response.data.data[i].assigneeId);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Handle any errors that occur during the request
    });