var restify = require('restify');
var builder = require('botbuilder');
var apiai = require('apiai');
var request = require('request');
//var app = apiai('19c8bad1930f4e28ad3527a8a69fda04');
var app = apiai('c8021e1a2dac4f85aee8f805a5a920b2');

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
var sender= '1214209198672394';
//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {
	console.log("Entering 1st");
	//console.log("Session*****", + JSON.stringify(session));
	//  console.log(" Session****** ", (session));
	console.log("sender",(sender));
	var options = { sessionId: '123456789abcdefghsuresh' }
	var req = app.textRequest(session.message.text, options);
	
	              req.on('response', function (response) {
			      
                     var intent = response.result.action;
                     console.log(JSON.stringify(response));
			 switch (straction) {					 
				 case "showopentickets":
			        case "showOutagetickets":
					        var struserid = '';    
            struserid='lt6sth4'; //hardcoding if its empty	
            console.log('struserid '+ struserid);
            var headersInfo = {"Content-Type": "application/json"};
            var args = {"headers":headersInfo,"json":{Flow:'TroubleShooting Flows\\ChatBot\\APIChatBot.xml',Request:{ThisValue:'showOutage',BotProviderId:'1422076921145354'}}};

            console.log("args=" + JSON.stringify(args));
		request.post('https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx',args,
    		function (error, response, body) {
        		if (!error && response.statusCode == 200) {
            		showOutageticketsCallback(body,session)
        		}
    		});
					 break;
					 
					  }
                    
              });
              request.on('error', function (error) {
                     console.log(error);
              });
              request.end();

	
        
});

  
function showOutageticketsCallback(apiresp,session) 
{	
    console.log('Inside showOutageCallback');
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response; 
    console.log("showOutagetickets=" + JSON.stringify(subflow));
	session.send(subflow.facebook.text);
 
} 

