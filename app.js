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
		var msg = new builder.HeroCard(session)
            .title('Azure Storage')
            .subtitle('Massively scalable cloud storage for your applications')
            .text('Store and help protect your data. Get durable, highly available data storage across the globe and pay only for what you use.')
            .images([
                builder.CardImage.create(session, 'https://acom.azurecomcdn.net/80C57D/cdn/mediahandler/docarticles/dpsmedia-prod/azure.microsoft.com/en-us/documentation/articles/storage-introduction/20160801042915/storage-concepts.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/storage/', 'Learn More')
            ]),

        new builder.ThumbnailCard(session)
            .title('DocumentDB')
            .subtitle('Blazing fast, planet-scale NoSQL')
            .text('NoSQL service for highly available, globally distributed apps—take full advantage of SQL and JavaScript over document and key-value data without the hassles of on-premises or virtual machine-based cloud database options.')
            .images([
                builder.CardImage.create(session, 'https://sec.ch9.ms/ch9/29f4/beb4b953-ab91-4a31-b16a-71fb6d6829f4/WhatisAzureDocumentDB_960.jpg')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/documentdb/', 'Learn More')
            ]),

        new builder.HeroCard(session)
            .title('Azure Functions')
            .subtitle('Process events with serverless code')
            .text('Azure Functions is a serverless event driven experience that extends the existing Azure App Service platform. These nano-services can scale based on demand and you pay only for the resources you consume.')
            .images([
                builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-8636d9bb8d979834d655a5d39d1b4e86b12956a2bcfdb8beb04730b6daac1b86/images/page/services/functions/azure-functions-screenshot.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/functions/', 'Learn More')
            ]),

        new builder.ThumbnailCard(session)
            .title('Cognitive Services')
            .subtitle('Build powerful intelligence into your applications to enable natural and contextual interactions')
            .text('Enable natural and contextual interaction with tools that augment users\' experiences using the power of machine-based intelligence. Tap into an ever-growing collection of powerful artificial intelligence algorithms for vision, speech, language, and knowledge.')
            .images([
                builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-8636d9bb8d979834d655a5d39d1b4e86b12956a2bcfdb8beb04730b6daac1b86/images/page/services/functions/azure-functions-screenshot.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/functions/', 'Learn More')
            ]);
		
		
        session.endDialog(msg);
		
		
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
