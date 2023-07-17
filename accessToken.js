var axios = require('axios');
var config = require('./config');
var fs = require('fs');

// Get an access token that will allow access to the Zoho Desk API
function getAccessToken() {
    // Don't get a new access token if the current one is still valid
    if (tokenStillValid()) {
        return new Promise(resolve => {
            resolve(config.accessToken);
        });
    }
    
    // Use the refresh token to get a new access token
    let url = 'https://accounts.zoho.com/oauth/v2/token';
    let grantType = 'refresh_token';
    let fullUrl = `${url}?refresh_token=${config.refreshToken}&client_id=${config.clientID}&client_secret=${config.clientSecret}&scope=${config.scope}&grant_type=${grantType}`;

    // Post request to get the token
    return axios.post(fullUrl)
        .then(response => {
            let validUntil = getValidUntil(response.data.expires_in);
            let accessToken = {id: response.data.access_token, expiration: validUntil};
            
            // Change the config file to contain updated values
            updateConfig(config.refreshToken, accessToken.id, validUntil);

            // return the token
            return accessToken.id;
        })
        .catch(error => {
          console.error(error);
          throw error;
        });
}

// Used to create the original access and refresh tokens
// This should not be used unless the refresh token has expired
// It requires going into the API UI and getting an access code
function createOriginalTokens() {
    let url = 'https://accounts.zoho.com/oauth/v2/token';
    let grantType = 'authorization_code';
    let fullUrl = `${url}?code=${config.code}&grant_type=${grantType}&client_id=${config.clientID}&client_secret=${config.clientSecret}`;

    return axios.post(fullUrl)
        .then(response => {
            console.log(response.data);

            // Change the config file to contain updated values
            updateConfig(response.data.refresh_token, response.data.access_token, getValidUntil(response.data.expires_in));
        })
        .catch(error => {
          console.error(error);
          throw error;
        });
}

// Change the config file to contain updated values
function updateConfig(refreshToken, accessToken, authTokenExpiration) {
    let configSetup = `module.exports = {\n\tcode: '${config.code}',\n\trefreshToken: '${refreshToken}',\n\taccessToken: '${accessToken}',\n\tauthTokenExpiration: ${authTokenExpiration},\n\tclientID: '${config.clientID}',\n\tclientSecret: '${config.clientSecret}',\n\tscope: '${config.scope}',\n\torgID: '${config.orgID}'\n};`;
    let configFname = 'config.js';
    fs.writeFile(configFname, configSetup, function (err) {
        if (err) throw err;
    });
}

// Determine when the access token will expire
function getValidUntil(expires_in) {
    let timeToExp = expires_in * 1000;
    let validUntil = Date.now() + timeToExp;
    return validUntil;
}

// Determine whether the access token has expired
function tokenStillValid() {
    return config.authTokenExpiration > Date.now();
}

module.exports = {
    getAccessToken,
    createOriginalTokens
};