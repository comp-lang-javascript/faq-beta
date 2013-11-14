var NNTP = require('nntp');

var server = "news.eternal-september.org", port = 119, group = "alt.test"; // TODO
var username = "CompLangJavascript", password = "**********";
var title = "Random Test", from = "FAQ Server <comp.lang.javascript@gmail.com>";
var body = "Some test content.\r\n\r\n.\r\n";

password = process.argv[2];
// console.log("Password: " + password);

var nntp = new NNTP(server, port);

nntp.start()
.then(function() {
    return nntp.authorize(username, password);
})
.then(function() {
    return nntp.chooseGroup(group);
})
.then(function() {
    return nntp.postMessage(title, from, body);
})
.then(function() {
    return nntp.quit();
})
.then(function() {
    var stop = new Date() - (-5000);
    setTimeout(function check() {
        var now = (new Date()).getTime();
        if (nntp.connected) {
            console.log("Successfully completed.");
        } else if (now > stop) {
            console.log("Connection timed out.")
        } else {
            setTimeout(check, 250);
        }
    }, 250);
})
.fail(function(err) {
    console.log("Could not post FAQ documents.");
    console.log(err);
    process.exit(999);
});
