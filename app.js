var restify = require('restify');
var builder = require('botbuilder');
var apiai = require('apiai');
//var app = apiai('19c8bad1930f4e28ad3527a8a69fda04');
var app = apiai('ba4202d56cf34d9c9b1dfb12162efc7f');
var request = require('request');

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
    if(session.message.text =="billsummary")
    {
	  //  session.send("CURR_BAL is $220.64");
	        request.on('response', function (response) {
    		showBillInfo(response,sender,function (str){ showBillInfoCallback(str,sender)});
    });	      
    }
	else
	{
		
     //session.send("Hello World");
    request.on('response', function (response) {
        var intent = response.result.action;        
        console.log(JSON.stringify(response));
        session.send(response.result.fulfillment.speech);   
	var msg = new builder.Message(session).attachment(response.result.fulfillment.data.facebook.attachment);
        console.log(JSON.stringify(msg));
        session.send(msg);
    });
    
    request.on('error', function (error)
      {
        console.log(error);
    });
    request.end();
	}
});
//========================

function showBillInfo(apireq, sender, callback) {
    logger.debug("showBillInfo Called");
    try {

        var args = {
            json: {
                Flow: config.FlowName,
                Request:
                {
                    ThisValue: 'BillInfo',
                    BotProviderId: sender
                }
            }
        };
        console.log(" Request for showBillInfo json " + JSON.stringify(args));
        request.post({
            url: 'https://www.verizon.com/fiostv/myservices/admin/botapinew.ashx',
            proxy: '',
            headers: headersInfo,
            method: 'POST',
            json: args.json
        },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(body);
                }
                else
                     console.log(' error on callback for showBillInfo : ' + error + ' body: ' + JSON.stringify(body));
            }
        );
    }
    catch (experr) {
       console.log('error on  showOutagetickets : ' + experr);
    }
    console.log("showOutagetickets completed");
}

function showBillInfoCallback(apiresp, usersession) {
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;


    logger.debug("showBillInfoCallback=" + JSON.stringify(subflow));
    if (subflow != null
        && subflow.facebook != null
        && subflow.facebook.text != null && subflow.facebook.text == 'UserNotFound') {
        console.log("showBillInfo subflow " + subflow.facebook.text);
      var respobj ={"facebook":{"attachment":{"type":"template","payload":{"template_type":"generic","elements":[
		{"title":"You have to Login to Verizon to proceed","image_url":"https://www98.verizon.com/foryourhome/vzrepair/siwizard/img/verizon-logo-200.png","buttons":[
			{"type":"account_link","url":"https://www98.verizon.com/vzssobot/upr/preauth"}]}]}}}};		
		session.send(usersession,  respobj.facebook);
	}

        session.send(usersession, respobj.facebook);
    }   


