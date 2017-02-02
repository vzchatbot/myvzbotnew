var restify = require('restify');
var builder = require('botbuilder');
var apiai = require('apiai');
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
	var request = app.textRequest(session.message.text, options);
    if (session.message.text == "my bill" || session.message.text == "qqqq" || session.message.text == "what is my bill"|| session.message.text == "show my bill"|| session.message.text == "bill?") {
		session.send("# BillSummary");
	    	session.send("your bill amount is **$170** and due on **02/09/2017**");			     
    }
     else if (session.message.text == "show outage" ||  session.message.text == "any outage") {
	     session.send("# Sorry for the inconvenience");
		session.send("* I see there's an outage in your area.");
	     session.send("* The ticket number is **MAEQ038807**");	
	     session.send("* It's expected to be resolved by tonight.");			     
	     		     
	     
    } 
	else if(session.message.text=="test")
	{
	    console.log('inside showOutagetickets call ');
            var struserid = '';    
            struserid='lt6sth4'; //hardcoding if its empty	
            console.log('struserid '+ struserid);
            var headersInfo = {"Content-Type": "application/json"};
            var args = {"headers":headersInfo,"json":{Flow:'TroubleShooting Flows\\ChatBot\\APIChatBot.xml',Request:{ThisValue:'showOutage',BotProviderId:'123'}}};

            console.log("args=" + JSON.stringify(args));
    request.post(" https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {	 
            if (!error && response.statusCode == 200) {             
                console.log("body " + JSON.stringify(body));
                showOutageticketsCallback(body);
            }	    
            else
                console.log('error: ' + error + ' body: ' + body);
        }
    );	
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

  
function showOutageticketsCallback(apiresp) 
{	
    console.log('Inside showOutageCallback');
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response; 
    console.log("showOutagetickets=" + JSON.stringify(subflow));	
 
} 

