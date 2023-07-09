const axios = require('axios');

function getAccessToken() {
  const url = 'https://accounts.zoho.com/oauth/v2/token';
  const fullUrl = `${url}?refresh_token=1000.bd8fdd262d7a5f3fd1c0dc7f85c9070c.1a9102296dd26265a771d0df5057b0b0&client_id=1000.K8ZBYBC2TPZTJTZG5R25CR7C2735WH&client_secret=0fecf52eb7f38ce0420bbb53a7d7fd0aebedd530f9&scope=Desk.tickets.ALL&grant_type=refresh_token`;

  return axios.post(fullUrl)
    .then(response => {
      let accessToken = response.data.access_token;
      return accessToken;
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
}

module.exports = getAccessToken;