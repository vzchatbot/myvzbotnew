var restify = require('restify');
var builder = require('botbuilder');
var apiai = require('apiai');
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
    
     var options = {        sessionId:'123456789abcdefghsuresh'				}
      var request = app.textRequest(session.message.text, options);
	var sender = event.sender.id.toString();
	console.log("session.message.text" ,+ JSON.stringify(session.message.text));
    if(session.message.text =="billsummary")
    {
	    console.log("Inside Bill Summary******");
	    session.send("CURR_BAL is $220.64");	    
    }
	else
	{
		
    
	}
});
