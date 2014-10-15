function define(name, value) {
    Object.defineProperty(exports, name, {
        value: value,
        enumerable: true
    });
}

define("RequestTypes", {
    GET: "GET",
    GIVE: "GIVE"
});

define("TxTypes", {
    "giveRequest": "giveRequest",
    "getRequest": "getRequest",
    "inviteReward": "inviteReward",
    "buyTnx": "buyTnx",
    "signupReward": "signupReward"
});

define("Rewards", {
    "signupReward": 12345,
    "inviteReward": 12345
});

define("SystemParamKeys", {
    "globalInvitations": "GLOBAL_INVITATIONS"
});