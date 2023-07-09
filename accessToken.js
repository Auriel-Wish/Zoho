const axios = require('axios');

function getAccessToken() {
  const url = 'https://accounts.zoho.com/oauth/v2/token';
  const refreshToken = '1000.bd8fdd262d7a5f3fd1c0dc7f85c9070c.1a9102296dd26265a771d0df5057b0b0';
  const clientID = '1000.K8ZBYBC2TPZTJTZG5R25CR7C2735WH';
  const clienSecret = '0fecf52eb7f38ce0420bbb53a7d7fd0aebedd530f9';
  const scope = 'Desk.tickets.ALL,Desk.settings.READ,Desk.basic.READ';
  const grantType = 'refresh_token';
  const fullUrl = `${url}?refresh_token=${refreshToken}&client_id=${clientID}&client_secret=${clienSecret}&scope=${scope}&grant_type=${grantType}`;
    // console.log(fullUrl);
  return axios.post(fullUrl)
    .then(response => {
      let accessToken = response.data.access_token;
      console.log(accessToken);
      return accessToken;
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
}

module.exports = getAccessToken;