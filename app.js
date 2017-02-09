var restify = require('restify');
var builder = require('botbuilder');
var apiai = require('apiai');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var JSONbig = require('json-bigint');
var async = require('async');
var log4js = require('log4js');
var fs = require('fs');
//var util = require('util');

var config = require('./config/devconfig.json');

const vz_proxy = config.vz_proxy;
var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080);
var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP || '127.0.0.1';
var APIAI_ACCESS_TOKEN = config.APIAIACCESSTOKEN;
var APIAI_LANG = 'en';
var APIAI_VERIFY_TOKEN = "verify123";
//var apiAiService = apiai(APIAI_ACCESS_TOKEN, { language: APIAI_LANG, requestSource: "fb", proxy: config.vz_proxy, secure: true });
var sessionIds = new Map();
var userData = new Map();

var apiAiService = apiai(APIAI_ACCESS_TOKEN);

log4js.configure({
    appenders: 
 [
        { type: 'console' },
        {
            type: 'dateFile', filename: 'botws.log', category: 'botws', "pattern": "-yyyy-MM-dd", "alwaysIncludePattern": false
        },
        {
            type: 'logLevelFilter',
            
            level: 'Info', 
            appender: {
                type: "dateFile",
                
                filename: 'botHistorylog.log',
                
                category: 'Historylog', 
                "pattern": "-yyyy-MM-dd", 
                "alwaysIncludePattern": false
            }
        }
    ]
});
var logger = log4js.getLogger("botws");
var ChatHistoryLog = log4js.getLogger('Historylog');

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

server.get('/apipolling/', function (req, res) {
   logger.debug("Inside api polling");
    try {
        var ebizResponse = "<?xml version=\"1.0\" encoding=\"utf-8\" ?><ebizcenter xmlns=\"http://tempuri.org/eBizCenter.xsd\"><version>1.2</version>";
        var sessioid = uuid.v1();
        var apiaiRequest = apiAiService.textProxyRequest("Hi polling", { sessionId: sessioid });

        apiaiRequest.on('response', function (response) {

            logger.debug("Polling apiai response " + response);
            ebizResponse = ebizResponse + "<response code=\"S\"/><error/><parameters><parameter name=\"API.AI\" datatype= \"string\" paramtype=\"\">Success</parameter></parameters></ebizcenter>";
            res.send(ebizResponse);

        });

        apiaiRequest.on('error', function (error) {

            ebizResponse = ebizResponse + "<response code=\"F\"/><error><source_code>BE</source_code><description>[[[" + error + "]]]</description></error><parameters><parameter name=\"API.AI\" datatype= \"string\" paramtype=\"\">Failure</parameter></parameters></ebizcenter>";
            res.send(ebizResponse);
            logger.debug("Error on sending polling request to api.ai " + error);

        });

        apiaiRequest.end2();
    }
    catch (err) {
        logger.debug("Error in sending polling api.ai " + err);
        ebizResponse = ebizResponse + "<response code=\"F\"/><error><source_code>BE</source_code><description>[[[" + err + "]]]</description></error><parameters><parameter name=\"API.AI\" datatype= \"string\" paramtype=\"\">Failure</parameter></parameters></ebizcenter>";
        res.send(ebizResponse);
    }

});

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function (session) {
	console.log("Entering 1st");
	console.log("api.ai" + APIAI_ACCESS_TOKEN);
	var userCoversationArr = '';
	//console.log("Session*****", + JSON.stringify(session));
	//  console.log(" Session****** ", (session));
	console.log("sender", (sender));
	var options = { sessionId: '123456789abcdefghsuresh' }
	var req = apiAiService.textRequest(session.message.text, options);
	console.log("Entering 2");
	req.on('response', function (response) {
		console.log("Entering 3");
		var straction = response.result.action;
		console.log(JSON.stringify(response));
		
		switch (straction) {					 
			case "showopentickets":
			case "showOutagetickets":
				var struserid = '';
				struserid = 'lt6sth4'; //hardcoding if its empty	
				console.log('struserid ' + struserid);
				var headersInfo = { "Content-Type": "application/json" };
				var args = { "headers": headersInfo, "json": { Flow: 'TroubleShooting Flows\\ChatBot\\APIChatBot.xml', Request: { ThisValue: 'showOutage', BotProviderId: '1422076921145354' } } };
				
				console.log("args=" + JSON.stringify(args));
				request.post('https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx', args,
    		function (error, response, body) {
					if (!error && response.statusCode == 200) {
						showOutageticketsCallback(body, session)
					}
				});
				break;
			case "channelsearch":
				logger.debug("----->>>>>>>>>>>> INSIDE channelsearch <<<<<<<<<<<------");
				//userCoversationArr.ufdreqdatetime = getDateTime();
				stationsearch(response, userCoversationArr, function (str) { stationsearchCallback(str, sender, userCoversationArr,session) });
				break;								 
		}
                    
	});
	req.on('error', function (error) {
		console.log(error);
	});
	req.end();	
        
});


function stationsearch(apireq, userCoversationArr, callback) {
	
	logger.debug('Inside stationsearch started');
	try {
		var strChannelName = apireq.result.parameters.Channel.toUpperCase();
		var strChannelNo = apireq.result.parameters.ChannelNo;
		var strRegionid = 91629;
		
		logger.debug("strChannelName " + strChannelName + " strChannelNo: " + strChannelNo);
		
		var args = {
			json: {
				Flow: config.FlowName,
				Request: {
					ThisValue: 'StationSearch',
					BotRegionID: strRegionid,
					BotstrFIOSServiceId: strChannelNo, //channel number search
					BotstrStationCallSign: strChannelName
				}
			}

		};
		
		logger.debug("json " + String(args));
		
		request({
			url: config.UFD_rest_api,			
			headers: config.headersInfo,
			method: 'POST',
			json: args.json
		}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				
				//console.log("body " + body);
				callback(body);
			}
			else {
				//userCoversationArr.ufdreq = 'error';
				printChatHistory(userCoversationArr);
				logger.debug('error on sending request to station search: ' + error + ' body: ' + body);
			}
		});
	}
    catch (experr) {
		logger.debug('error on  station search detail : ' + experr);
	}
	logger.debug('Inside stationsearch completed');
}

function stationsearchCallback(apiresp, senderid, userCoversationArr,session) {
	var objToJson = {};
	objToJson = apiresp;
	try {
		
		logger.debug("stationsearchCallback ");
		
		//userCoversationArr.ufdresdatetime = getDateTime();
		//userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
		//userCoversationArr.ufdreq = 'passed';
		printChatHistory(userCoversationArr);
		
		var respobj = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
		logger.debug("Station Search Response " + JSON.stringify(respobj));
		
		var cards = getCardsAttachments();
		
		// create reply with Carousel AttachmentLayout
		var reply = new builder.Message(session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);
		
		//session.send(reply);

		var msg = new builder.Message(session)
            .sourceEvent({
			
				attachment: {
					type: "template",
					payload: {
						template_type: "receipt",
						recipient_name: "Stephane Crozatier",
						order_number: "12345678902",
						currency: "USD",
						payment_method: "Visa 2345",        
						order_url: "http://petersapparel.parseapp.com/order?order_id=123456",
						timestamp: "1428444852", 
						elements: [
							{
								title: "Classic White T-Shirt",
								subtitle: "100% Soft and Luxurious Cotton",
								quantity: 2,
								price: 50,
								currency: "USD",
								image_url: "http://petersapparel.parseapp.com/img/whiteshirt.png"
							},
							{
								title: "Classic Gray T-Shirt",
								subtitle: "100% Soft and Luxurious Cotton",
								quantity: 1,
								price: 25,
								currency: "USD",
								image_url: "http://petersapparel.parseapp.com/img/grayshirt.png"
							}
						],
						address: {
							street_1: "1 Hacker Way",
							street_2: "",
							city: "Menlo Park",
							postal_code: "94025",
							state: "CA",
							country: "US"
						},
						summary: {
							subtotal: 75.00,
							shipping_cost: 4.95,
							total_tax: 6.19,
							total_cost: 56.14
						},
						adjustments: [
							{ name: "New Customer Discount", amount: 20 },
							{ name: "$10 Off Coupon", amount: 10 }
						]
					}
				}
			
		});
		//session.endDialog(msg);

		var msg = new builder.Message(session)
            .attachments([{
				contentType: "image/jpeg",
				contentUrl: "http://www.theoldrobots.com/images62/Bender-18.JPG"
			}]);
		session.endDialog(msg);

		/*
		   var msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Whats On HBO")
                    .items([
                        builder.ReceiptItem.create(session, "#899", "HBO HD").image(builder.CardImage.create(session, "http://www.verizon.com/resources/clu/cluimages/5714_1.jpg")),
				builder.ReceiptItem.create(session, "#400", "HBO").image(builder.CardImage.create(session, "http://www.verizon.com/resources/clu/cluimages/5493_1.jpg")),
				builder.ReceiptItem.create(session, "#902", "HBO 2 HD").image(builder.CardImage.create(session, "http://www.verizon.com/resources/clu/cluimages/5716_1.jpg")),
				builder.ReceiptItem.create(session, "#402", "HBO 2").image(builder.CardImage.create(session, "http://www.verizon.com/resources/clu/cluimages/5495_1.jpg")),
				builder.ReceiptItem.create(session, "#403", " HBO 2 West").image(builder.CardImage.create(session, "http://www.verizon.com/resources/clu/cluimages/5496_1.jpg"))
                    ])
                    
            ]);
                session.endDialog(msg);
		*/
		
	}
    catch (experr) {
		logger.debug('error on  station search detail : ' + experr);
	}
	
	logger.debug("station search completed");
}


function showOutageticketsCallback(apiresp,session) 
{	
    console.log('Inside showOutageCallback');
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response; 
    console.log("showOutagetickets=" + JSON.stringify(subflow));
	session.send(subflow.facebook.text); 
}
function printChatHistory(userCoversationArr) {
	
}
function test(sesssion) {

}
function getCardsAttachments(session) {
	return [
		new builder.HeroCard(session)
            .title('HBO HD')
            .subtitle('#899')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5714_1.jpg')
		])
            .buttons([
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'Tune In'),
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'See Whats on')

		]),

		new builder.HeroCard(session)
            .title('HBO')
            .subtitle('#400L')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5493_1.jpg')
		])
            .buttons(  [
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO', 'Tune In'),
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'See Whats on')
	]
),
			

		new builder.HeroCard(session)
            .title('HBO HD')
            .subtitle('#899')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5714_1.jpg')
		])
            .buttons([
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'Tune In'),
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'See Whats on')
		]),

		new builder.HeroCard(session)
            .title('HBO')
            .subtitle('#400L')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5493_1.jpg')
		])
            .buttons([
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO', 'Tune In'),
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'See Whats on')
		])
	];
}
function getCardsAttachments_1(session) {
	return [
		new builder.HeroCard(session)
            .title('HBO HD')
            .subtitle('#899')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5714_1.jpg')
		])
            .buttons([
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'Tune In')
		]),
		new builder.HeroCard(session)
            .title('HBO HD')
            .subtitle('#899')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5714_1.jpg')
		])
            .buttons([
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'Tune In')
		]),
		new builder.HeroCard(session)
            .title('HBO HD')
            .subtitle('#899')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5714_1.jpg')
		])
            .buttons([
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'Tune In')
		]),
		new builder.HeroCard(session)
            .title('HBO HD')
            .subtitle('#899')
            .text('')
            .images([
			builder.CardImage.create(session, 'http://www.verizon.com/resources/clu/cluimages/5714_1.jpg')
		])
            .buttons([
			builder.CardAction.openUrl(session, 'https://www98.verizon.com/vzbot/vzbotproxy/deeplink?IsLive=true&CallSign=HBO HD', 'Tune In')
		])
	];
}