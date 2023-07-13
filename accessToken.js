var axios = require('axios');
var config = require('./config');
var fs = require('fs');

function getAccessToken() {
    if (tokenStillValid()) {
        return new Promise(resolve => {
            resolve(config.accessToken);
        });
    }
    
    let url = 'https://accounts.zoho.com/oauth/v2/token';
    let grantType = 'refresh_token';
    let fullUrl = `${url}?refresh_token=${config.refreshToken}&client_id=${config.clientID}&client_secret=${config.clientSecret}&scope=${config.scope}&grant_type=${grantType}`;

    return axios.post(fullUrl)
        .then(response => {
            let validUntil = getValidUntil(response.data.expires_in);
            let accessToken = {id: response.data.access_token, expiration: validUntil};
            
            updateConfig(config.refreshToken, accessToken.id, validUntil);
            return accessToken.id;
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
            updateConfig(response.data.refresh_token, response.data.access_token, getValidUntil(response.data.expires_in));
        })
        .catch(error => {
          console.error(error);
          throw error;
        });
}

function updateConfig(refreshToken, accessToken, authTokenExpiration) {
    let configSetup = `module.exports = {\n\tcode: '${config.code}',\n\trefreshToken: '${refreshToken}',\n\taccessToken: '${accessToken}',\n\tauthTokenExpiration: ${authTokenExpiration},\n\tclientID: '${config.clientID}',\n\tclientSecret: '${config.clientSecret}',\n\tscope: '${config.scope}',\n\torgID: '${config.orgID}'\n};`;
    let configFname = 'config.js';
    fs.writeFile(configFname, configSetup, function (err) {
        if (err) throw err;
    });
}

function getValidUntil(expires_in) {
    let timeToExp = expires_in * 1000;
    let validUntil = Date.now() + timeToExp;
    return validUntil;
}

function tokenStillValid() {
    return config.authTokenExpiration > Date.now();
}

module.exports = {
    getAccessToken,
    createOriginalTokens
};