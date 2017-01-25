var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var apiai = require('apiai');
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
var APIAI_LANG = 'en' ;
var APIAI_ACCESS_TOKEN = "c8021e1a2dac4f85aee8f805a5a920b2"; 
var apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================
var headersInfo = { "Content-Type": "application/json" };
bot.dialog('/', function (session) {
	console.log("Start Bill Summary")
	/*	
	    session.send("# BillSumary");	
		session.send("Your bill amount is **$170** and due on **02/09/2017**");	
	*/
	var options = { sessionId: '1214209198672394' }
	console.log("options",options)
	 var apiaiRequest  = apiAiService.textRequest(session.message.text, options);
	console.log("apiaiRequest" ,+ JSON.stringify(apiaiRequest))
        apiaiRequest .on('response', function (response)  {
	 showBillInfo(response,session,function (str){ showBillInfoCallback(str,session)});
	});
	
});

function showBillInfo(apireq, sender, callback) {
    console.log("showBillInfo Called");
    try {

        var args = {
            json: {
                Flow: config.FlowName,
                Request:
                {
                    ThisValue: 'BillInfo',
                    BotProviderId: '945495155552625'
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
        var respobj = {
            "facebook": {
                "attachment": {
                    "type": "template", "payload": {
                        "template_type": "generic", "elements": [
                            {
                                "title": "You have to Login to Verizon to proceed", "image_url": config.vzImage, "buttons": [
                                    { "type": "account_link", "url": config.AccountLink }]
                            }]
                    }
                }
            }
        };

        session.send(usersession, respobj.facebook);
    }
    else {
        session.send(usersession, subflow.facebook);
    }
}
