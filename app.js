var restify = require('restify');
var builder = require('botbuilder');
var apiai = require('apiai');
//var app = apiai('19c8bad1930f4e28ad3527a8a69fda04');
var app = apiai('ba4202d56cf34d9c9b1dfb12162efc7f');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: 'f83feefc-16d4-485f-9395-d407ff0602a8',
    appPassword: 'yq9ZmaxhNhbFJVh4AAP4gc6'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {

	var options = { sessionId: '123456789abcdefghsuresh' }
	var request = app.textRequest(session.message.text, options);
    if (session.message.text == "mybill" || session.message.text == "bill") {
		session.send("# BillSummary");
	    	session.send("your bill amount is **$170** and due on **02/09/2017**");			     
    }
     else if (session.message.text == "show outage" || session.message.text == "outage" ||  session.message.text == "any outage") {
		session.send("I see there's an outage in your area.It's expected to be resolved by tonight,The ticket number is **MAEQ038807**.Sorry for the inconvenience");			     
    }
    else {

		//session.send("Hello World");
		request.on('response', function (response) {
			var intent = response.result.action;
			console.log(JSON.stringify(response));
			session.send(response.result.fulfillment.speech);
			var msg = new builder.Message(session).attachment(response.result.fulfillment.data.facebook.attachment);
			console.log(JSON.stringify(msg));
			session.send(msg);
		});

		request.on('error', function (error) {
			console.log(error);
		});
		request.end();
	}
});
