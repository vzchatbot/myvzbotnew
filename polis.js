var restify = require('restify');
var builder = require('botbuilder');
var apiai = require('apiai');
var app = apiai('19c8bad1930f4e28ad3527a8a69fda04');

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
    appId: '3cc73cc0-e212-488e-8d47-4cab7f593c32',
    appPassword: 'puWLpDg39kquQNmzmqfKQ09'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {
    
     var options = {        sessionId:'123456789abcdefghsuresh'				}
      var request = app.textRequest(session.message.text, options);
    
     //session.send("Hello World");
    request.on('response', function (response) {
        var intent = response.result.action;        
        console.log(JSON.stringify(response));

        session.send(response.result.fulfillment.speech);   
		var msg = new builder.Message(session).attachment(response.result.fulfillment.data.facebook.attachment		);
        console.log(JSON.stringify(msg));
        session.send(msg);
    });
    
    request.on('error', function (error)
      {
        console.log(error);
    });
    request.end()
    
});
