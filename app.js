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
		var msg ="{'facebook': { 'attachment': { 'type': 'template','payload': { 'template_type': 'generic','elements': [{'title': 'Shark Tank','subtitle': 'Shark Tank','image_url': 'http://image.vam.synacor.com.edgesuite.net/0f/07/0f07592094a2a596d2f6646271e9cb0311508415/w=414,h=303,crop=auto/?sig=88c390c980d4fa53d37ef16fbdc53ec3dfbad7d9fa626949827b76ae37140ac3&amp;app=powerplay','buttons': [    {'type': 'web_url','url': 'http://www.youtube.com/embed/SQ1W7RsXL3k','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'    }]    },    {'title': 'Game of Thrones','subtitle': 'Game of Thrones','image_url': 'http://ia.media-imdb.com/images/M/MV5BMjM5OTQ1MTY5Nl5BMl5BanBnXkFtZTgwMjM3NzMxODE@._V1_UX182_CR0,0,182,268_AL_.jpg','buttons': [    {'type': 'web_url','url': 'https://www.youtube.com/watch?v=36q5NnL3uSM','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'    }]    },    {'title': 'The Night Of','subtitle': 'The Night Of','image_url': 'http://ia.media-imdb.com/images/M/MV5BMjQyOTgxMDI0Nl5BMl5BanBnXkFtZTgwOTE4MzczOTE@._V1_UX182_CR0,0,182,268_AL_.jpg','buttons': [    {'type': 'web_url','url': 'https://www.youtube.com/watch?v=36q5NnL3uSM','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'}]}]}}}}";
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

