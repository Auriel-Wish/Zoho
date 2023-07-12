const axios = require('axios');
const config = require('./config');

function getAccessToken() {
    let url = 'https://accounts.zoho.com/oauth/v2/token';
    let grantType = 'refresh_token';
    let fullUrl = `${url}?refresh_token=${config.refreshToken}&client_id=${config.clientID}&client_secret=${config.clientSecret}&scope=${config.scope}&grant_type=${grantType}`;

    return axios.post(fullUrl)
        .then(response => {
            let accessToken = response.data.access_token;
            // console.log(accessToken);
            return accessToken;
        })
        .catch(error => {
          console.error(error);
          throw error;
        });
}

function createOriginalTokens() {
    let url = 'https://accounts.zoho.com/oauth/v2/token';
    let grantType = 'authorization_code';
    let fullUrl = `${url}?code=${config.code}&grant_type=${grantType}&client_id=${config.clientID}&client_secret=${config.clientSecret}`;

    return axios.post(fullUrl)
        .then(response => {
            console.log(response.data);
            console.log(response.data.refresh_token);
        })
        .catch(error => {
          console.error(error);
          throw error;
        });
}

module.exports = {
    getAccessToken,
    createOriginalTokens
};