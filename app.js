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
	     		     
	     
    } else if (session.message.text == "outage") {	
	  //   console.log("outage******");
	       var apiaiRequest  = apiAiService.textRequest(text,{sessionId: sessionIds.get(sender)});
       		 apiaiRequest .on('response', function (response)  {
        	    if (isDefined(response.result)) {
                var responseText = response.result.fulfillment.speech;
                var responseData = response.result.fulfillment.data;
                var action = response.result.action;		    
                var intent = response.result.metadata.intentName;
                console.log(JSON.stringify(response));
                var Finished_Status=response.result.actionIncomplete;
                console.log("Finished_Status "+ Finished_Status);		    
                console.log('responseText  : - '+ responseText);
                console.log('responseData  : - '+ responseData);
                console.log('action : - '+ action );
                console.log('intent : - '+ intent );	
	      showOutagetickets(response,sender,function (str){ showOutageticketsCallback(str,sender)});
	   apiaiRequest.end();
    }
}
	    /*
	   request.on('response', function (response) {
			var intent = response.result.action;
		  	  console.log(" intent****** ", + JSON.stringify(intent));
			console.log(" Response****** ", + JSON.stringify(response));
			session.send(response.result.fulfillment.speech);
			var msg = new builder.Message(session).attachment(response.result.fulfillment.data);
			console.log("MSG values ******", + JSON.stringify(msg));
			session.send(msg);
		});
	    request.on('error', function (error) {
			console.log(error);
		});
		request.end();	   */  
		
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
//=====================showOutage
	function showOutagetickets(apireq,sender,callback) { 
    console.log('inside showOutagetickets call ');
    var struserid = ''; 
    for (var i = 0, len = apireq.result.contexts.length; i < len; i++) {
        if (apireq.result.contexts[i].name == "sessionuserid") {
            struserid = apireq.result.contexts[i].parameters.Userid;
            console.log("original userid " + ": " + struserid);
        }
    } 	
    if (struserid == '' || struserid == undefined) struserid='lt6sth4'; //hardcoding if its empty	
    console.log('struserid '+ struserid);
   console.log('Sender JJJ '+ sender);
		
    var headersInfo = {"Content-Type": "application/json"};
    var args = {"headers":headersInfo,"json":{Flow:'TroubleShooting Flows\\ChatBot\\APIChatBot.xml',Request:{ThisValue:'showOutage',BotProviderId:sender}}};

   // var args = {"json":{Flow:'TroubleShooting Flows\\ChatBot\\APIChatBot.xml',Request:{ThisValue: 'showOutage',BotProviderId :sender}}};	
  
console.log("args=" + JSON.stringify(args));
    request.post(" https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {	 
            if (!error && response.statusCode == 200) {             
                console.log("body " + JSON.stringify(body));
                callback(body);
            }	    
            else
                console.log('error: ' + error + ' body: ' + body);
        }
    );
} 
  
function showOutageticketsCallback(apiresp,usersession) 
	{	
console.log('Inside showOutageCallback');
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response; 
    console.log("showOutagetickets=" + JSON.stringify(subflow));
		
    //fix to single element array 
   if (subflow != null 
         && subflow.facebook != null 
         && subflow.facebook.attachment != null 
         && subflow.facebook.attachment.payload != null 
         && subflow.facebook.attachment.payload.buttons != null) {
        try {
            var pgms = subflow.facebook.attachment.payload.buttons;
            console.log ("Is array? "+ util.isArray(pgms))
            if (!util.isArray(pgms))
            {
                subflow.facebook.attachment.payload.buttons = [];
                subflow.facebook.attachment.payload.buttons.push(pgms);
                console.log("showopentickets=After=" + JSON.stringify(subflow));
            }
        }catch (err) { console.log(err); }
    } 
	 console.log("showOutageticketsCallBack=" + JSON.stringify(subflow));	
	if (subflow != null 
        && subflow.facebook != null 
        && subflow.facebook.text != null && subflow.facebook.text =='UserNotFound')
	{
		console.log ("showOutageticketsCallBack subflow "+ subflow.facebook.text);
		var respobj ={"facebook":{"attachment":{"type":"template","payload":{"template_type":"generic","elements":[
		{"title":"You have to Login to Verizon to proceed","image_url":"https://www98.verizon.com/foryourhome/vzrepair/siwizard/img/verizon-logo-200.png","buttons":[
			{"type":"account_link","url":"https://www98.verizon.com/vzssobot/upr/preauth"}]}]}}}};		
		session.send(usersession,  respobj.facebook);
	}
	else
	{	
         session.send(usersession,  subflow.facebook);
	}
} 

