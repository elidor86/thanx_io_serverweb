fs = require('fs');


var configFile = fs.readFileSync('/home/bitconnectServer/config.json');
configFile = configFile.toString('utf8');
configFile = JSON.parse(configFile);

console.log(configFile);

module.exports = {
    // Facebook API id and secret
    FBappId: '761433597207088',
    FBsecret: '483c2bafec24598467c82270bbde6dbc',
    // The address to which one sends money to buy thanx
    thanxAddress: '12thanx6bXb1ScDcDnHaGistMEVtYrjWMX',//"1EzwQ7un2j6QFSXDB1nfSWTNLjGPH6wCJB"
    // SSL private key
    keyfile: 'ssl/bitconnectwildkey.pem',
    // SSL public key/certificate
    certfile: 'ssl/bitconnectwildcert.pem',
    blockChain: {
        password: configFile.password,
        second_password: configFile.second_password
    },
    superUser: {
        id: "123456thanx",
        username: "thanx.bitconnect.me",
        address: "12thanx6bXb1ScDcDnHaGistMEVtYrjWMX"//"1EzwQ7un2j6QFSXDB1nfSWTNLjGPH6wCJB"
    },
    strings: {
        buyTnxMsg: ""
    }
};


