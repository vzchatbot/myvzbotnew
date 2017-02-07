'use strict';

var apiai = require('./core/extlib/apiai/index.js');
var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var request = require('request');
var JSONbig = require('json-bigint');
var async = require('async');
var log4js = require('log4js');
var fs = require('fs');
var util = require('util');

var config = require('./config/devconfig.json');

const vz_proxy = config.vz_proxy;
var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080);
var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP || '127.0.0.1';
var APIAI_ACCESS_TOKEN = config.APIAIACCESSTOKEN;
var APIAI_LANG = 'en';
var FB_VERIFY_TOKEN = config.FBVERIFYTOKEN;
var FB_PAGE_ACCESS_TOKEN = config.FBPAGEACCESSTOKEN;
var APIAI_VERIFY_TOKEN = "verify123";
var apiAiService = apiai(APIAI_ACCESS_TOKEN, { language: APIAI_LANG, requestSource: "fb", proxy: config.vz_proxy, secure: true });
var sessionIds = new Map();
var userData = new Map();

//======================


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

var app = express();
app.use(bodyParser.text({ type: 'application/json' }));

app.listen(REST_PORT, SEVER_IP_ADDR, function () {
    logger.debug('Rest service ready on port ' + REST_PORT);
});

app.get('/webhook/', function (req, res) {
    logger.debug("inside webhook get");
    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(function () {
            doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong FB validation token');
    }
});

/* This method will using for making the api.ai always awake. */
/*
app.get('/apipolling/', function (req, res) {
    logger.debug("Inside api polling");
    try {
		var ebizResponse = "<?xml version=\"1.0\" encoding=\"utf-8\" ?><ebizcenter xmlns=\"http://tempuri.org/eBizCenter.xsd\"><version>1.2</version>";
        var sessioid = uuid.v1();
        var apiaiRequest = apiAiService.textProxyRequest("Hi polling", { sessionId: sessioid });
        apiaiRequest.on('response', function (response) {
            logger.debug("Polling apiai response " + response);
			ebizResponse = ebizResponse + "<response code=\"S\"/><error/><parameters><parameter name=\"API.AI\" datatype= \"string\" paramtype=\"\"> - Success - </parameter></parameters>";
            res.send(ebizResponse);
        });
        apiaiRequest.on('error', function (error) { logger.debug("Error on sending polling request to api.ai " + error) });
        apiaiRequest.end2();
    }
    catch (err) {
        logger.debug("Error in sending polling api.ai " + err);
    }

}); */

app.get('/apipolling/', function (req, res) {
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

// Pasha Code Change 01/02/2017 : Added the settimeout for weird behaviour.
app.post('/webhook/', function (req, res) {
    try {
        var data = JSONbig.parse(req.body);

        logger.debug("Webhook body" + req.body);

        if (data.entry) {
            setTimeout(function () {
                var entries = data.entry;
                entries.forEach(function (entry) {

                    var messaging_events = entry.messaging;

                    if (messaging_events) {

                        messaging_events.forEach(function (event) {

                            if (event.sender) {
                                var SenderID = event.sender.id;
                            }

                            if (event.recipient) {
                                var RecipientID = event.recipient.id;
                            }

                            if (event.message) {

                                var logdatetime = getDateTime();

                                var TimeStamp = event.timestamp;

                                var MessageID = event.message.mid;

                                var MessageText = event.message.text;


                                var isBotRespondedBack;

                                //1807994092745948 = FB User Sender ID
                                // Update the "isBotRespondedBack" variable to YES/NO only when the FB as sender else update as "User sent to FB Bot"
                                if (SenderID == config.Facebook_SenderID) {
                                    if (event.message.text || event.message.attachment || event.message.attachments) {

                                        logger.debug("Bot responded back to user");
                                        isBotRespondedBack = "YES";
                                    }
                                    else {
                                        logger.debug("Bot Not responded back to user");
                                        isBotRespondedBack = "NO";
                                    }
                                }
                                else {
                                    logger.debug("User Sent to Facebook");
                                    var userCoversationArr = { printDateTime: '', UserRequestDate: logdatetime, interactionid: uuid.v1(), senderid: SenderID, receipentid: RecipientID, timestamp: TimeStamp, messageid: MessageID, CXquestion: MessageText, userreq: 'passed', apireqdatetime: '', action: '', intent: '', apiresdatetime: '', apiTimeTaken: '', apiaireq: 'Inprogress', ufdreqdatetime: '', ufdresdatetime: '', ufdTimeTaken: '', ufdreq: 'Notstarted', botresponsedatetime: '', botresponse: '', senttofb: 'Notyetsent', botresponsetime: '' };
                                    isBotRespondedBack = "User sent to FB Bot";
                                }

                                //ChatHistoryLog.info("|" + logdatetime + "|" + SenderID + "|" + RecipientID + "|" + TimeStamp + "|" + MessageID + "| " + MessageText + "| Undefined | Undefined |" + isBotRespondedBack);
                            }
                            else if (event.postback) {
                                var TimeStamp = event.timestamp;
                                var logdatetime = getDateTime();

                                var MessageText = event.postback.payload;

                                var isBotRespondedBack;

                                //1807994092745948 = FB User Sender ID
                                // Update the "isBotRespondedBack" variable to YES/NO only when the FB as sender else update as "User sent to FB Bot"
                                if (SenderID == config.Facebook_SenderID) {
                                    if (event.postback.payload) {

                                        logger.debug("Bot responded back to user");
                                        isBotRespondedBack = "YES";
                                    }
                                    else {
                                        logger.debug("Bot Not responded back to user");
                                        isBotRespondedBack = "NO";
                                    }
                                }
                                else {
                                    logger.debug("User Sent to Facebook");
                                    isBotRespondedBack = "User sent to FB Bot";
                                    var userCoversationArr = { printDateTime: '', UserRequestDate: logdatetime, interactionid: uuid.v1(), senderid: SenderID, receipentid: RecipientID, timestamp: TimeStamp, messageid: 'Payload', CXquestion: MessageText, userreq: 'passed', apireqdatetime: '', action: '', intent: '', apiresdatetime: '', apiTimeTaken: '', apiaireq: 'Inprogress', ufdreqdatetime: '', ufdresdatetime: '', ufdTimeTaken: '', ufdreq: 'Notstarted', botresponsedatetime: '', botresponse: '', senttofb: 'Notyetsent', botresponsetime: '' };
                                }

								//ChatHistoryLog.info("|" + logdatetime + "|" + SenderID + "|" + RecipientID + "|" + TimeStamp + "| Payload | " + MessageText + "| Undefined | Undefined |" + isBotRespondedBack);
                            }
                            else if (event.account_linking) {
                                var TimeStamp = event.time;
                                var logdatetime = getDateTime();
                                var status = '';
                                if (event.account_linking.status)
                                    status = event.account_linking.status;

                                var userCoversationArr = { printDateTime: '', UserRequestDate: logdatetime, interactionid: uuid.v1(), senderid: SenderID, receipentid: RecipientID, timestamp: TimeStamp, messageid: 'AccountLinking', CXquestion: status, userreq: 'passed', apireqdatetime: 'NA', action: 'NA', intent: 'NA', apiresdatetime: 'NA', apiTimeTaken: 'NA', apiaireq: 'NA', ufdreqdatetime: '', ufdresdatetime: '', ufdTimeTaken: '', ufdreq: 'Notstarted', botresponsedatetime: '', botresponse: '', senttofb: 'Notyetsent', botresponsetime: '' };

                            }

                            if (event.message && !event.message.is_echo ||
                                event.postback && event.postback.payload ||
                                event.account_linking) {

                                printChatHistory(userCoversationArr);

                                processEvent(event, userCoversationArr);

                            }
                        });
                    }
                });
            }, 500);
        }

        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        logger.debug("Error in post api.ai " + err);
        return res.status(400).json({
            status: "error",
            error: err
        });
    }
});
app.get('/deeplink', function (req, res) {
    var cType;
    var reqUrl;
    var redirectURL;
    var contentString;
    var redirectAppStoreURL = "https://itunes.apple.com/us/app/verizon-fios-mobile/id406387206";
    var redirectPlayStoreURL = "market://details?id=com.verizon.fiosmobile";

    var beginHtml = "<html><head><title></title><script type='text/javascript' charset='utf-8'>";
    var endHtml = "</script></head> <body> <img src='https://www98.verizon.com/vzssobot/content/verizon-logo-200.png' /> </body> </html>";

    var iOSscript = " var isActive = true;  var testInterval = function () { if(isActive) { window.location='" + redirectAppStoreURL + "';} else {clearInterval(testInterval); testInterval = null;} }; window.onfocus = function () { if(!isActive) return; else {isActive = true;}}; window.onblur = function () { isActive = false; };  setInterval(testInterval, 5000); "

    var androidScript = " setTimeout(function () { window.location.replace('" + redirectPlayStoreURL + "'); }, 500); ";

    var contentType = req.query.ContentType;
    var userAgent = req.headers['user-agent'].toLowerCase();

    logger.debug("DeepLink-Started");
    logger.debug("User agent " + req.get('User-Agent'));

    cType = contentType ? ((contentType == 'MOVIE') ? 'MOV' : (contentType == 'SEASON') ? 'SEASON' : 'TVS') : 'TVS';

    if (userAgent.match(/(iphone|ipod|ipad)/)) {
        if (req.query.fiosID) {
            reqUrl = "/details?" + "fiosID=" + req.query.fiosID + "&ContentType=" + cType;
            if (req.query.SeriesID) {
                reqUrl = reqUrl + "&SeriesID=" + req.query.SeriesID;
            }
        }
        else if (cType == 'SEASON') {
            reqUrl = "/details?" + "SeriesID=" + encodeURI(req.query.SeriesID);
        }
        else if (req.query.PID && req.query.PAID) {
            reqUrl = "/details?" + "PID=" + req.query.PID + "&PAID=" + req.query.PAID;
        }
        else if (req.query.CID) {
            reqUrl = "/details?" + "CID=" + req.query.CID + "&ContentType=" + cType;
        }
        else if (req.query.IsLive) {
            reqUrl = "/WN";
        }
        else {
            reqUrl = "/APPLAUNCH";
        }
        redirectURL = 'vz-carbon://app' + reqUrl;

        //console.log("Request URL = " + redirectURL);

        contentString = beginHtml + "window.location = '" + redirectURL + "'; " + iOSscript + endHtml;
    }
    else if (userAgent.match(/(android)/)) {
        if (req.query.fiosID) {
            reqUrl = "/tvlistingdetail/" + req.query.fiosID;
        }
        else if (req.query.CID) {
            var conType = (cType == 'MOV') ? 'moviedetails' : 'tvepisodedetails';
            reqUrl = ".mm/" + conType + "/" + req.query.CID;
        }
        else if (req.query.IsLive) {
            reqUrl = "/fragmentname/watchnow";
        }
        else {
            reqUrl = "";
        }
        redirectURL = 'app://com.verizon.fiosmobile' + reqUrl;
        //console.log("Request URL = " + redirectURL);

        contentString = beginHtml + " window.location = '" + redirectURL + "'; " + androidScript + endHtml;
    }
    else {
        var uri = 'http://tv.verizon.com/';
        var callSign = req.query.CallSign;
        callSign = callSign ? ((callSign.slice(-2) == 'HD') ? callSign.slice(0, -2) : callSign) : '';
        redirectURL = req.query.IsLive ? (uri + 'livetv/' + callSign) : uri;
        contentString = beginHtml + " window.location='" + redirectURL + "'; " + endHtml;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(contentString);
    res.end();

    logger.debug("DeepLink-Ended");
});
//=================================

doSubscribeRequest();

function processEvent(event, userCoversationArr) {
    var sender = event.sender.id.toString();

    if ((event.message && event.message.text) || (event.postback && event.postback.payload)) {
        var text = event.message ? event.message.text : event.postback.payload;
        logger.debug("Before Account Linking ");

        if (!sessionIds.has(sender)) {
            logger.debug("Inside sessionID:- ");
            sessionIds.set(sender, uuid.v1());
        }

        var ReqSenderID = event.sender.id.toString();
        var ReqRecipientID = event.recipient.id.toString();
        var ReqMessageText = text;
        var ReqTimeStamp;
        var ReqMessageID;

        if (event.timestamp) {
            ReqTimeStamp = event.timestamp.toString();
        }

        if (event.message) {
            if (event.message.mid) {
                ReqMessageID = event.message.mid.toString();
            }
        }

        if (event.postback && event.postback.payload && event.postback.payload.indexOf("RetryAuthCode|") > 0) {
            var authCode = event.postback.payload.split("|")[1];
            var paramArr = { authCodeParam: authCode, senderParam: sender, userIdParam: "" };

            getvzUserID(authCode, function (str) { getvzUserIDCallback(str, paramArr) });


        } else {

            userCoversationArr.apireqdatetime = getDateTime();

            var apiaiRequest = apiAiService.textProxyRequest(text, { sessionId: sessionIds.get(sender) });

            apiaiRequest.on('response', function (response) {

                if (isDefined(response.result)) {

                    var responseText = response.result.fulfillment.speech;
                    var responseData = response.result.fulfillment.data;
                    var action = response.result.action;

                    var intent = response.result.metadata.intentName;
                    var Finished_Status = response.result.actionIncomplete;

                    logger.debug("Finished_Status " + Finished_Status);
                    logger.debug('responseText  : - ' + responseText);
                    logger.debug('responseData  : - ' + responseData);
                    logger.debug('action : - ' + action);
                    logger.debug('intent : - ' + intent);

                    //var isBotRespondedBack = "Api.ai Req & Res";

                    var logdatetime = getDateTime();

                    userCoversationArr.action = action;
                    userCoversationArr.intent = intent;

                    userCoversationArr.apiresdatetime = getDateTime();
                    userCoversationArr.apiTimeTaken = getsecondstaken('apiai', userCoversationArr.apireqdatetime, userCoversationArr.apiresdatetime);
                    userCoversationArr.apiaireq = 'passed';
                    printChatHistory(userCoversationArr);

                    //ChatHistoryLog.info("|" + JSON.stringify(ReqSenderID) + "|" + JSON.stringify(ReqRecipientID) + "|" + JSON.stringify(ReqTimeStamp) + "|" + JSON.stringify(ReqMessageID) + "| " + JSON.stringify(ReqMessageText) + "|" + JSON.stringify(action) + "|" + JSON.stringify(intent) + "| Undefined");
                    //ChatHistoryLog.info("|" + logdatetime + "|" + ReqSenderID + "|" + ReqRecipientID + "|" + ReqTimeStamp + "|" + ReqMessageID + "| " + ReqMessageText + "|" + action + "|" + intent + "|" + isBotRespondedBack);

                    // see if the intent is not finished play the prompt of API.ai or fall back messages
                    if (Finished_Status == true || intent == "Default Fallback Intent") {
                        sendFBMessage(sender, { text: responseText }, userCoversationArr);
                    }
                    else //if the intent is complete do action
                    {
                        logger.debug("----->>>>>>>>>>>> INTENT SELECTION <<<<<<<<<<<------");
                        var straction = response.result.action;
                        console.log("Selected_action : " + straction);
                        // Methods to be called based on action 
                        switch (straction) {
                            case "getStarted":
                                logger.debug("----->>>>>>>>>>>> INSIDE getStarted <<<<<<<<<<<------");
                                //welcomeMsg(sender);
                                logger.debug("Sender ID " + sender);
                                var senderArr = { senderParam: sender };
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                GetAuthProfile(senderArr, userCoversationArr, function (str) { GetAuthMessageCallback(str, senderArr, userCoversationArr) });
                                break;
                            case "LinkOptions":
                                logger.debug("----->>>>>>>>>>>> INSIDE LinkOptions <<<<<<<<<<<------");
                                logger.debug("Sender ID " + sender);
                                var senderArr = { senderParam: sender };
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                GetAuthProfile(senderArr, userCoversationArr, function (str) { GetAuthProfileCallback(str, senderArr, userCoversationArr) });
                                break;
                            case "MoreOptions":
                                logger.debug("----->>>>>>>>>>>> INSIDE MoreOptions <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = 'NA';
                                userCoversationArr.ufdresdatetime = 'NA'
                                userCoversationArr.ufdTimeTaken = 'NA'
                                userCoversationArr.ufdreq = 'NA'
                                sendFBMessage(sender, { text: responseText }, userCoversationArr);
                                break;
                            case "MainMenu":
                                logger.debug("----->>>>>>>>>>>> INSIDE MainMenu <<<<<<<<<<<------");
                                MainMenu(sender, userCoversationArr);
                                break;
                            case "record":
                                logger.debug("----->>>>>>>>>>>> INSIDE recordnew <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                RecordScenario(response, sender, userCoversationArr);
                                break;
                            case "CategoryList":
                                logger.debug("----->>>>>>>>>>>> INSIDE CategoryList <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = 'NA';
                                userCoversationArr.ufdresdatetime = 'NA'
                                userCoversationArr.ufdTimeTaken = 'NA'
                                userCoversationArr.ufdreq = 'NA'
                                CategoryList(response, sender, userCoversationArr);
                                break;
                            case "pkgSearch":
                                logger.debug("----->>>>>>>>>>>> INSIDE Package search <<<<<<<<<<<------");
                                var strChannelName = response.result.parameters.Channel.toUpperCase();
                                var strGenre = response.result.parameters.ChannelGenre.toUpperCase();
                                logger.debug(" Channel Name " + strChannelName);
                                logger.debug(" Genre " + strGenre);
                                logger.debug(" Sender ID " + sender);

                                var ChnArr = { channalName: strChannelName, senderParam: sender, regionParam: "", vhoidParam: "", cktidParam: "", Genre: strGenre };

                                userCoversationArr.ufdreqdatetime = getDateTime();
                                packageChannelSearch(sender, ChnArr, userCoversationArr, function (str) { packageChannelSearchCallback(str, ChnArr, userCoversationArr) });
                                break;
                            case "recommendation":
                                logger.debug("----->>>>>>>>>>>> INSIDE recommendation <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                recommendations(response, 'OnLater', sender, userCoversationArr, function (str) { recommendationsCallback(str, sender, userCoversationArr) });
                                break;
                            case "OnNowrecommendation":
                                logger.debug("----->>>>>>>>>>>> INSIDE OnNowrecommendation <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                recommendations(response, 'OnNow', sender, userCoversationArr, function (str) { recommendationsCallback(str, sender, userCoversationArr) });
                                break;
                            case "channelsearch":
                                logger.debug("----->>>>>>>>>>>> INSIDE channelsearch <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                stationsearch(response, userCoversationArr, function (str) { stationsearchCallback(str, sender, userCoversationArr) });
                                break;
                            case "programSearch":
                                logger.debug("----->>>>>>>>>>>> INSIDE programSearch <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                PgmSearch(response, sender, userCoversationArr, function (str) { PgmSearchCallback(str, sender, userCoversationArr) });
                                break;
                            case "support":
                                logger.debug("----->>>>>>>>>>>> INSIDE support <<<<<<<<<<<------");
                                support(sender, userCoversationArr);
                                break;
                            case "upgradeDVR":
                                logger.debug("----->>>>>>>>>>>> INSIDE upgradeDVR <<<<<<<<<<<------");
                                upgradeDVR(response, sender, userCoversationArr);
                                break;
                            case "upsell":
                                logger.debug("----->>>>>>>>>>>> INSIDE upsell <<<<<<<<<<<------");
                                upsell(response, sender, userCoversationArr);
                                break;
                            case "Billing":
                                logger.debug("----->>>>>>>>>>>> INSIDE Billing <<<<<<<<<<<------");
                                support(sender);
                                /*userCoversationArr.ufdreqdatetime = getDateTime();
                                showBillInfo(response, sender, userCoversationArr, function (str) { showBillInfoCallback(str, sender, userCoversationArr) });*/
                                break;
                            /*case "cancelappointmentnotconfirmed":
                                logger.debug("----->>>>>>>>>>>> INSIDE cancelappointment <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                cancelscheduledticket(response, sender, userCoversationArr, function (str) { cancelscheduledticketCallBack(str, sender, userCoversationArr) });
                                break;
                            case "Rescheduleticket":
                                logger.debug("----->>>>>>>>>>>> INSIDE Rescheduleticket <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                Rescheduleticket(response, sender, userCoversationArr, function (str) { RescheduleticketCallback(str, sender, userCoversationArr) });
                                break;
                            case "showopentickets":
                                logger.debug("----->>>>>>>>>>>> INSIDE showopentickets <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                showopentickets(response, sender, userCoversationArr, function (str) { showopenticketsCallback(str, sender, userCoversationArr) });
                                break;
                            case "showOutagetickets":
                                logger.debug("----->>>>>>>>>>>> INSIDE showOutagetickets <<<<<<<<<<<------");
                                userCoversationArr.ufdreqdatetime = getDateTime();
                                showOutagetickets(response, sender, userCoversationArr, function (str) { showOutageticketsCallback(str, sender, userCoversationArr) });
                                break;*/
                            default:
                                logger.debug("----->>>>>>>>>>>> INSIDE default <<<<<<<<<<<------");

                                userCoversationArr.ufdreqdatetime = 'NA';
                                userCoversationArr.ufdresdatetime = 'NA'
                                userCoversationArr.ufdTimeTaken = 'NA'
                                userCoversationArr.ufdreq = 'NA'

                                if ((responseText == undefined) || (responseText == ''))
                                    responseText = "I'm sorry. I'm having trouble understanding the question.";

                                sendFBMessage(sender, { text: responseText }, userCoversationArr);
                                break;
                        }
                    }
                }
            });

            apiaiRequest.on('error', function (error) {
                logger.debug("Error on sending request to api.ai " + error)
                userCoversationArr.apiaireq = 'error';
                printChatHistory(userCoversationArr);
            });
            apiaiRequest.end2();
        }
    } else if (event.account_linking) {
        logger.debug("event account_linking content :- " + JSON.stringify(event.account_linking));
        logger.debug("Account Linking null - 1");
        if (event.account_linking == undefined) {
            logger.debug("Account Linking null - 2");
        }
        else if (event.account_linking.status === "linked") {
            logger.debug("Account Linking convert: Auth Code" + JSON.stringify(event.account_linking.authorization_code, null, 2));
            logger.debug("Account Linking convert: Status " + JSON.stringify(event.account_linking.status, null, 2));
            var authCode = event.account_linking.authorization_code;

            //delete event.account_linking;
            var paramArr = { authCodeParam: authCode, senderParam: sender, userIdParam: "" };
            userCoversationArr.ufdreqdatetime = getDateTime();
            getvzUserID(authCode, userCoversationArr, function (str) { getvzUserIDCallback(str, paramArr, userCoversationArr) });


        } else if (event.account_linking.status === "unlinked") {
            //Place holder code to unlink.
            logger.debug("Account unlinked");
            userCoversationArr.ufdreqdatetime = getDateTime();
            DeleteAuthProfile(sender, userCoversationArr, function (str) { DeleteAuthProfileCallback(str, sender, userCoversationArr) });
        }
    }
}

function sendFBMessage(sender, messageData, userCoversationArr) {
    request({
        url: 'https://graph.facebook.com/v2.8/me/messages',
        proxy: config.vz_proxy,
        qs: { access_token: FB_PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData
        }
    }, function (error, response, body) {

        var logdatetime = getDateTime();
        userCoversationArr.botresponsedatetime = logdatetime;

        if (error) {

            logger.debug('Error sending FB message: ', error);
            userCoversationArr.senttofb = 'error';
            userCoversationArr.botresponse = "Error sending FB Message" + error;

        } else if (response.body.error) {
            logger.debug('Error sending FB message: ', response.body.error);
            userCoversationArr.senttofb = 'error';
            userCoversationArr.botresponse = "Error sending FB Message" + response.body.error;

        } else if (!error && response.statusCode == 200) {

            logger.debug('Sucessfully sent to faceboook');
            userCoversationArr.senttofb = 'passed';
            if (messageData.text) {
                userCoversationArr.botresponse = messageData.text;
            }
            else if (messageData.attachment) {
                if (messageData.attachment.payload) {
                    if (messageData.attachment.payload.text) {
                        logger.debug("Attachment Payload Text " + messageData.attachment.payload.text);
                        userCoversationArr.botresponse = messageData.attachment.payload.text + " With Options";
                    }
                    else {
                        userCoversationArr.botresponse = "Bot responded back with carousels without text";
                    }
                }
            }
            else if (messageData.attachments) {
                if (messageData.attachments.payload) {
                    if (messageData.attachments.payload.text) {
                        logger.debug("Attachment Payload Text " + messageData.attachments.payload.text);
                        userCoversationArr.botresponse = messageData.attachments.payload.text + " With Options";
                    }
                    else {
                        userCoversationArr.botresponse = "Bot responded back with carousels without text";
                    }
                }
            }
            else
                userCoversationArr.botresponse = JSON.stringify(messageData);
        }

        // Print the chat history
        userCoversationArr.botresponsetime = getsecondstaken('finalbotresponse', userCoversationArr.UserRequestDate, userCoversationArr.botresponsedatetime);
        printChatHistory(userCoversationArr);
    });


}

function doSubscribeRequest() {
    request({
        method: 'POST',
        uri: "https://graph.facebook.com/v2.8/me/subscribed_apps?access_token=" + FB_PAGE_ACCESS_TOKEN,
        proxy: config.vz_proxy
    },
        function (error, response, body) {
			if (error) {
				logger.debug('Error while subscription: ', error);
			} else {
				logger.debug('Subscription result: ', response.body);
			}
		});
}

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var msec = date.getMilliseconds();
    msec = (msec < 10 ? "0" : "") + msec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return month + "/" + day + "/" + year + " " + hour + ":" + min + ":" + sec + ":" + msec;

}

function getsecondstaken(whatreq, fromdate, todate) {
    var retsecondsTook;
    try {
        var reqDate = new Date(fromdate);
        var resDate = new Date(todate);

        var differenceTravel = resDate.getTime() - reqDate.getTime();
        retsecondsTook = Math.floor((differenceTravel) / (1000));
        logger.debug("Total seconds Taken for " + whatreq + " is " + retsecondsTook);
        retsecondsTook = retsecondsTook.toString();
    }
    catch (dateDiffexp) {
        logger.debug("Exception while getting the time taken between two dates : " + dateDiffexp)
    }

    return retsecondsTook;
}

function printChatHistory(userCoversationArr) {
    userCoversationArr.printDateTime = getDateTime();
    ChatHistoryLog.info("|" + userCoversationArr.printDateTime + "|" + userCoversationArr.UserRequestDate + "|" + userCoversationArr.interactionid + "|" + userCoversationArr.senderid + "|" + userCoversationArr.receipentid + "|" + userCoversationArr.timestamp + "| " + userCoversationArr.messageid + "|" + userCoversationArr.CXquestion + "|" + userCoversationArr.userreq + "|" + userCoversationArr.apireqdatetime + "|" + userCoversationArr.action + "|" + userCoversationArr.intent + "|" + userCoversationArr.apiresdatetime + "|" + userCoversationArr.apiTimeTaken + "|" + userCoversationArr.apiaireq + "|" + userCoversationArr.ufdreqdatetime + "|" + userCoversationArr.ufdresdatetime + "|" + userCoversationArr.ufdTimeTaken + "|" + userCoversationArr.ufdreq + "|" + userCoversationArr.botresponsedatetime + "|" + userCoversationArr.botresponse + "|" + userCoversationArr.senttofb + "|" + userCoversationArr.botresponsetime);
}

// Functionality related call(s):

function welcomeMsg(senderid, userCoversationArr) {
    logger.debug("inside welcomeMsg");

    sendFBMessage(senderid, { text: "Before we get started-let's link me to your Verizon account, so I can send you personalized recommendations through messenger. Don't worry - your Verizon Username and Password will not be shared with Facebook." }, userCoversationArr);

    var respobj =
        {
            "facebook":
            {
                "attachment":
                {
                    "type": "template",
                    "payload":
                    {
                        "template_type": "button",
                        "text": "By continuing, you understand that all information exchanged in Messenger is accessible by Facebook and will be used per Facebook's privacy policy. www.facebook.com/about/privacy",
                        "buttons":
                        [
                            {
                                "type": "postback",
                                "title": "Link Account",
                                "payload": "Link Account"
                            },
                            {
                                "type": "postback",
                                "title": "Maybe later",
                                "payload": "Main Menu"
                            }
                        ]
                    }
                }
            }
        };


    sendFBMessage(senderid, respobj.facebook, userCoversationArr);

}

function MainMenu(senderid, userCoversationArr) {
    logger.debug("Main Menu")

    var respobj =
        {
            "facebook":
            {
                "attachment":
                {
                    "type": "template",
                    "payload":
                    {
                        "template_type": "button",
                        "text": "Are you looking for something to watch, or do you want to see more options? Type or tap below.",
                        "buttons":
                        [
                            {
                                "type": "postback",
                                "title": "On Now",
                                "payload": "On Now"
                            },
                            {
                                "type": "postback",
                                "title": "On Later",
                                "payload": "On Later"
                            },
                            {
                                "type": "postback",
                                "title": "More Options",
                                "payload": "More Options"
                            }
                        ]
                    }
                }
            }
        };

    sendFBMessage(senderid, respobj.facebook, userCoversationArr);
}

function CategoryList(apireq, senderid, userCoversationArr) {
    logger.debug("Category list")
    var pgNo = apireq.result.parameters.PageNo;
    var categlist = {}

    switch (pgNo) {
        case '1':
            categlist = {
                "facebook":
                {
                    "text": "Pick a category",
                    "quick_replies": [
                        { "content_type": "text", "title": "Children & Family", "payload": "show Kids movies" },
                        { "content_type": "text", "title": "Action & Adventure", "payload": "show Action movies" },
                        { "content_type": "text", "title": "Documentary", "payload": "show Documentary movies" },
                        { "content_type": "text", "title": "Mystery", "payload": "show Mystery movies" },
                        { "content_type": "text", "title": "More Categories ", "payload": "show categories list pageno: 2" }
                    ]
                }
            };
            break;
        default:
            categlist = {
                "facebook":
                {
                    "text": "I can also sort my recommendations for you by genre. Type or tap below",
                    "quick_replies": [
                        { "content_type": "text", "payload": "Show Comedy movies", "title": "Comedy" },
                        { "content_type": "text", "payload": "Show Drama movies", "title": "Drama" },
                        { "content_type": "text", "title": "Music", "payload": "show Music shows" },
                        { "content_type": "text", "payload": "Show Sports program", "title": "Sports" },
                        { "content_type": "text", "payload": "show Sci-Fi movies", "title": "Sci-Fi" },
                        { "content_type": "text", "title": "Children & Family", "payload": "show Kids movies" },
                        { "content_type": "text", "title": "Action & Adventure", "payload": "show Action movies" },
                        { "content_type": "text", "title": "Documentary", "payload": "show Documentary movies" },
                        { "content_type": "text", "title": "Mystery", "payload": "show Mystery movies" }
                        // { "content_type": "text", "payload":"show categories list pageno: 1" , "title":"More Categories "}
                    ]
                }
            };
            break;
    }
    sendFBMessage(senderid, categlist.facebook, userCoversationArr);

}

function support(senderid, userCoversationArr) {
    var respobj =
        {
            "facebook":
            {
                "attachment":
                {
                    "type": "template",
                    "payload":
                    {
                        "template_type": "button",
                        "text": "You may need some additional help. Tap one below.",
                        "buttons":
                        [
                            {
                                "type": "web_url",
                                "url": "https://m.me/project.styx",
                                "title": "Chat with Agent "
                            }
                        ]
                    }
                }
            }
        };

    sendFBMessage(senderid, respobj.facebook, userCoversationArr);
}

function accountlinking(senderid, userCoversationArr) {
    logger.debug('Account Linking Button');

    var respobj = {
        "facebook":
        {
            "attachment":
            {
                "type": "template", "payload":
                {
                    "template_type": "generic", "elements": [
                        {
                            "title": "Login to Verizon", "image_url": config.vzImage, "buttons": [
                                { "type": "account_link", "url": config.AccountLink }]
                        }]
                }
            }
        }
    };

    sendFBMessage(senderid, respobj.facebook, userCoversationArr);

}

function accountUnlink(senderid, logoutTitle, userCoversationArr) {

    logger.debug('Account Unlinking Button');
    logger.debug('Logout Title ' + logoutTitle);
    var respobj =
        {
            "facebook":
            {
                "attachment":
                {
                    "type": "template", "payload":
                    {
                        "template_type": "generic", "elements":
                        [
                            {
                                "title": logoutTitle,
                                "buttons":
                                [
                                    {
                                        "type": "account_unlink"
                                    },
                                    {
                                        "type": "postback",
                                        "title": "Continue",
                                        "payload": "Main Menu"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        };

    sendFBMessage(senderid, respobj.facebook, userCoversationArr);

}

function getvzUserID(authcode, userCoversationArr, callback) {
    // Using Authcode pull the user ID from DB.
    logger.debug("getvzUserID started");
    logger.debug(" getvzUserID Auth Code " + authcode);
    try {
        var args = {
            json: {
                Request: {
                    op: "GETFBACCOUNTLINKDETAILS",
                    Authcode: authcode
                }
            }
        }
        logger.debug('Request json for getvzUserID using Auth code ' + JSON.stringify(args));
        request({
            url: config.FTCV_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug(' error on getvzuserID : ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on  getvzuserID : ' + experr);
    }
    logger.debug("getvzUserID completed");
}

function getvzUserIDCallback(apiresp, paramArr, userCoversationArr) {

    logger.debug("getvzUserIDCallback started");

    var objToJson = {};
    objToJson = apiresp;

    try {
        var UD_UserID = objToJson.oDSAccountDetails.oDAAccountDetails.strUserID;

        logger.debug(" UserID:" + JSON.stringify(UD_UserID))

        paramArr.userIdParam = UD_UserID;
    }
    catch (err) {
        logger.debug(' error on getvzUserIDCallback : ' + err);
    }

    getVzProfileAccountUpdate(UD_UserID, userCoversationArr, function (str) { getVzProfileAccountUpdateCallBack(str, paramArr, userCoversationArr) });

    logger.debug("getvzUserIDCallback completed");
}

function getVzProfileAccountUpdate(struserid, userCoversationArr, callback) {
    logger.debug('Inside getVzProfileAccountUpdate Profile');
    try {
        var args = {
            json: {
                Flow: config.FlowName,
                Request: { ThisValue: 'GetProfile', Userid: struserid }
            }

        };
        logger.debug('Request Json for getting the vzprofile details ' + JSON.stringify(args));

        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                //console.log("body " + body);
                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug('error on getting the vzprofile details using user ID: ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on  vzprofile detail : ' + experr);
    }
    logger.debug('Inside getVzProfileAccountUpdate completed');
}

function getVzProfileAccountUpdateCallBack(apiresp, paramArr, userCoversationArr) {
    logger.debug('Inside getVzProfileAccountUpdateCallBack');
    try {

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        var strUserid = paramArr.userIdParam;
        var strAuth1 = paramArr.authCodeParam;
        var senderid = paramArr.senderParam;

        var objToJson = {};
        objToJson = apiresp;

        logger.debug("Response from getVzProfileAccountUpdateCallBack " + JSON.stringify(objToJson));

        var profileDetails = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

        var CKTID_1 = JSON.stringify(profileDetails.ProfileResponse.CKTID, null, 2)
        var regionId = JSON.stringify(profileDetails.ProfileResponse.regionId, null, 2)
        var vhoId = JSON.stringify(profileDetails.ProfileResponse.vhoId, null, 2)
        var CanNo = JSON.stringify(profileDetails.ProfileResponse.Can, null, 2)
        var VisionCustId = JSON.stringify(profileDetails.ProfileResponse.VisionCustId, null, 2)
        var VisionAcctId = JSON.stringify(profileDetails.ProfileResponse.VisionAcctId, null, 2)

        var args = {
            json: {
                Request: {
                    op: "FBACCOUNTLINKACTIVITY",
                    VHOID: vhoId != null ? vhoId.replace(/\"/g, "") : null,
                    RegionID: regionId != null ? regionId.replace(/\"/g, "") : null,
                    CircuitID: CKTID_1 != null ? CKTID_1.replace(/\"/g, "") : null,
                    SenderID: senderid != null ? senderid.replace(/\"/g, "") : null,
                    UserID: strUserid != null ? strUserid.replace(/\"/g, "") : null,
                    CanNo: CanNo != null ? CanNo.replace(/\"/g, "") : null,
                    VisionCustId: VisionCustId != null ? VisionCustId.replace(/\"/g, "") : null,
                    VisionAcctId: VisionAcctId != null ? VisionAcctId.replace(/\"/g, "") : null
                }
            }
        }

        logger.debug('Request jSON for updating the vzprofile details ' + JSON.stringify(args));

        request({
            url: config.FTCV_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                //console.log("body " + body);

                sendFBMessage(senderid, { text: "Great! You have linked me to your Verizon account.You can unlink me whenever you want by tapping the bottom left menu." }, userCoversationArr);
                MainMenu(senderid, userCoversationArr);
            }
            else {
                logger.debug('error on updating the vzprofile details : ' + error + ' body: ' + JSON.stringify(body));
                var authCode = "RetryAuthCode|" + paramArr.authCodeParam;
                var template = { "attachment": { "type": "template", "payload": { "template_type": "button", "text": "Sorry, looks like there was a problem linking to your Verizon account. Tap below for support", "buttons": [{ "type": "postback", "title": "Retry Account Link", "payload": authCode }, { "type": "postback", "title": "Link Account later", "payload": "Main Menu" }] } } }
                sendFBMessage(senderid, template, userCoversationArr);
            }
        });
    }
    catch (err) {
        logger.debug(err);
        var senderid = paramArr.senderParam;
        var authCode = "RetryAuthCode|" + paramArr.authCodeParam;
        var template = { "attachment": { "type": "template", "payload": { "template_type": "button", "text": "Sorry, looks like there was a problem linking to your Verizon account. Tap below for support", "buttons": [{ "type": "postback", "title": "Retry Account Link", "payload": authCode }, { "type": "postback", "title": "Link Account later", "payload": "Main Menu" }] } } }
        sendFBMessage(senderid, template, userCoversationArr);
    }

    logger.debug('Inside getVzProfileAccountUpdateCallBack completed');
}

function GetAuthProfile(senderArr, userCoversationArr, callback) {

    logger.debug('Inside GetAuthProfile started');
    var senderid = senderArr.senderParam;
    try {
        logger.debug("Sender ID " + senderid);

        var args = {
            json: {
                Flow: config.FlowName,
                Request: {
                    ThisValue: 'GetAuthProfile',
                    BotProviderId: senderid
                }
            }

        };
        logger.debug("Request args for get auth profile" + JSON.stringify(args));

        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug('error on posting getauth profile : ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on  getauth profile detail : ' + experr);
    }
    logger.debug('Inside GetAuthProfile completed');
}

function GetAuthProfileCallback(apiresp, senderArr, userCoversationArr) {
    logger.debug('Inside GetAuthProfile callback started');
    var objToJson = {};
    objToJson = apiresp;
    try {

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';

        printChatHistory(userCoversationArr);

        var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

        logger.debug("subflow " + JSON.stringify(subflow));

        if (subflow != null && subflow == 'UserNotFound') {
            logger.debug("User Not Found");
            logger.debug("userid " + subflow);

            accountlinking(senderArr.senderParam, userCoversationArr);
        }
        else {
            logger.debug("User Found");
            logger.debug("userid " + subflow);

            //accountUnlink(senderArr.senderParam);
            getFBNameprofile(senderArr.senderParam, userCoversationArr, function (str) { getFBNameprofilecallback(str, senderArr.senderParam, userCoversationArr) });
        }
    }
    catch (err) {
        logger.debug('error on posting getauth profile : ' + error + ' body: ' + JSON.stringify(body));
    }

    logger.debug('Inside GetAuthProfile callback completed');
}

function GetAuthMessageCallback(apiresp, senderArr, userCoversationArr) {
    logger.debug('Inside GetAuthMessageCallback started');
    var objToJson = {};
    objToJson = apiresp;
    var senderid = senderArr.senderParam;
    try {

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

        logger.debug("subflow " + JSON.stringify(subflow));

        if (subflow != null && subflow == 'UserNotFound') {
            logger.debug("User Not Found");
            logger.debug("userid " + subflow);
            welcomeMsg(senderid, userCoversationArr);
        }
        else {
            logger.debug("User Found");
            logger.debug("userid " + subflow);
            MainMenu(senderid, userCoversationArr);
        }

    }
    catch (err) {
        logger.debug('error on posting getauth profile : ' + error + ' body: ' + JSON.stringify(subflow));
    }

    logger.debug('Inside GetAuthProfile callback completed');
}

function getFBNameprofile(sessionID, userCoversationArr, callback) {
    logger.debug('Inside getFBNameprofile started');
    // Get the users profile information from FB
    request({
        url: 'https://graph.facebook.com/v2.8/' + sessionID + '?fields=first_name',
        proxy: config.vz_proxy,
        qs: { access_token: FB_PAGE_ACCESS_TOKEN },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(body)
        } else {
            // TODO: Handle errors
            logger.debug("Get FB user profile failed");
        }
    });
    logger.debug('Inside getFBNameprofile completed');
}

function getFBNameprofilecallback(apiresp, sessionID, userCoversationArr) {

    logger.debug('Inside getFBNameprofilecallback started');
    apiresp = JSON.parse(apiresp);

    var greetingMessage = '';
    var logoutMessage = ", you are already logged-in. Do you want to log out or continue?"

    try {

        logger.debug("FB Get Profile response " + JSON.stringify(apiresp));

        if (apiresp != null && apiresp != 'undefined') {
            logger.debug("FB First Name " + apiresp.first_name);

            if (apiresp.first_name != null && apiresp.first_name != 'undefined') {
                greetingMessage = "Hey " + apiresp.first_name;
                logoutMessage = greetingMessage + logoutMessage;
            }
            accountUnlink(sessionID, logoutMessage, userCoversationArr)
        }
        else {
            logger.debug("no userName from facebook");
            accountUnlink(sessionID, "You are already logged-in. Do you want to log out or continue?", userCoversationArr)
        }
    }
    catch (err) {
        logger.debug('error on getting the FB details : ' + err + ' body: ' + JSON.stringify(apiresp));
    }

    logger.debug('Inside getFBNameprofilecallback callback completed');
}

function DeleteAuthProfile(senderid, userCoversationArr, callback) {
    logger.debug("DeleteAuthProfile started ");
    try {
        var args = {
            json: {
                Flow: config.FlowName,
                Request: {
                    ThisValue: 'DeleteAuthProfile',
                    BotProviderId: senderid
                }
            }

        };

        logger.debug("Request Json for delete Auth Profile " + JSON.stringify(args));

        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                //logger.debug("body " + body);
                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug('error on delete auth profile callback : ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on DeleteAuthProfile : ' + experr);
    }

    logger.debug("DeleteAuthProfile Ended ");
}

function DeleteAuthProfileCallback(apiresp, senderid, userCoversationArr) {
    logger.debug("DeleteAuthProfileCallback enter ");
    try {
        var objToJson = {};
        objToJson = apiresp;

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        logger.debug("Response Json for Delete Auth Profile " + JSON.stringify(subflow));

        if (objToJson[0].Inputs.newTemp == undefined) {
            sendFBMessage(senderid, { text: "Unable to process the request" }, userCoversationArr);
        }
        else {
            var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
            //logger.debug("subflow " + JSON.stringify(subflow));

            if (subflow != null && subflow == 'Success') {
                //logger.debug("userid at successs " + subflow);
                sendFBMessage(senderid, { text: "Your account has been unlinked" }, userCoversationArr);

            }
            else {
                //logger.debug("userid if not success " + subflow);
                sendFBMessage(senderid, { text: "Unable to process the request" }, userCoversationArr);
            }
        }
    }
    catch (err) {
        logger.debug(" Catch Error on DeleteAuthProfileCallback " + err);
        sendFBMessage(senderid, { text: "Unable to process the request" }, userCoversationArr);
    }

    logger.debug("DeleteAuthProfileCallback completed ");

}

function packageChannelSearch(senderid, ChnArr, userCoversationArr, callback) {

    logger.debug("Package Channel Search Called");
    try {
        var channe_Name = ChnArr.channalName;
        var senderid = ChnArr.senderParam;
        var genre = ChnArr.Genre;

        logger.debug(" Sender ID " + senderid);
        logger.debug(" Channel Name " + channe_Name);
        logger.debug(" Genre " + genre);

        var args = {};
        if (genre == "" || genre == undefined) {
            args = {
                json: {
                    Flow: config.FlowName,
                    Request: {
                        'ThisValue': 'AuthPKGSearch',
                        'BotCircuitID': '',
                        'BotstrStationCallSign': channe_Name,
                        'BotChannelNo': '',
                        'BotVhoId': '',
                        'BotstrFIOSRegionID': '',
                        'BotProviderId': senderid
                    }
                }

            };
        }
        else {
            args = {
                json: {
                    Flow: config.FlowName,
                    Request: {
                        'ThisValue': 'AuthPKGSearch',
                        'BotCircuitID': '',
                        'BotstrGenreRootId': genre,
                        'BotChannelNo': '',
                        'BotVhoId': '',
                        'BotstrFIOSRegionID': '',
                        'BotProviderId': senderid
                    }
                }

            };

        }


        logger.debug(" Request for package search json " + JSON.stringify(args));

        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug(' error on callback for package search : ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on  package search : ' + experr);
        sendCommonErrorMsg(senderid);
    }
    logger.debug("Package Channel Search completed");
}

function packageChannelSearchCallback(apiresp, ChnArr, userCoversationArr) {

    logger.debug("packageChannelSearchCallback called");

    var senderid = ChnArr.senderParam;
    var channe_Name = ChnArr.channalName;
    var Genre = ChnArr.Genre;
    var returntext;

    try {

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        var objToJson = {};
        objToJson = apiresp;

        var respobj = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

        logger.debug(" Package Search Response " + JSON.stringify(respobj));

        if (respobj != null && respobj.facebook != null && respobj.facebook.attachment != null) {

            //console.log("less than 10 channels ");

            //fix to single element array 
            if (respobj != null
				&& respobj.facebook != null
				&& respobj.facebook.attachment != null
				&& respobj.facebook.attachment.payload != null
				&& respobj.facebook.attachment.payload.elements != null) {
                try {
                    var chanls = respobj.facebook.attachment.payload.elements;
                    //console.log(" Is array? " + util.isArray(chanls))
                    if (!util.isArray(chanls)) {
                        respobj.facebook.attachment.payload.elements = [];
                        respobj.facebook.attachment.payload.elements.push(chanls);
                        logger.debug(" Package Search CallBack = After =" + JSON.stringify(respobj));
                    }
                } catch (err) { logger.debug("Error on channel not available on PKG Search " + err); }
            }

            if (Genre == "" || Genre == undefined) {
                if (channe_Name == "" || channe_Name == undefined) {
                    returntext = "Your package does include following channels!! Watch it on the channels below!";
                }
                else {
                    returntext = "Your package does include " + channe_Name + "! Watch it on the channels below!";
                }
            }
            else {
                // returntext = "That's right, following " + Genre + " channel(s) are part of your package:";
                returntext = "Your package does include " + Genre + "! Watch it on the channels below!";
            }
            sendFBMessage(senderid, { text: returntext }, userCoversationArr);
            sendFBMessage(senderid, respobj.facebook, userCoversationArr);
        }
        else {
            logger.debug("Sorry i dont find channel details");
            if (Genre == "" || Genre == undefined) {
                if (channe_Name == "" || channe_Name == undefined) {
                    //returntext = "Sorry we don't find any channels in your package. Can you try another";
                    returntext = "I can't find any channels right now. Can you try a different channel?";
                }
                else {
                    //returntext = "Sorry " + channe_Name + " is not part for your package. Can you try another.";
                    //returntext = "Sorry your package does not include "+ channe_Name + ". Can you try another.";
                    returntext = "I can't find " + channe_Name + ", right now. Can you try a different channel?";
                }
            }
            else {
                //returntext = "Sorry following " + Genre + " is not part for your package. Can you try another.";
                //returntext = "Sorry your package does not include "+ Genre + ". Can you try another.";
                returntext = "I can't find " + Genre + ", right now. Can you try a different genre?";
            }
            sendFBMessage(senderid, { text: returntext }, userCoversationArr);
        }
    }
	catch (err) {
        logger.debug(" Catch Error on pkg search call back " + err);
        var senderid = ChnArr.senderParam;
        //var channe_Name = ChnArr.channalName;
        var returntext = "I can't find any channels right now. Can you try a different channel?";
        sendFBMessage(senderid, { text: returntext }, userCoversationArr);
    }

    logger.debug("packageChannelSearchCallback completed");
}

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
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                //console.log("body " + body);
                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
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

function stationsearchCallback(apiresp, senderid, userCoversationArr) {
    var objToJson = {};
    objToJson = apiresp;
    try {

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        var respobj = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
        logger.debug("Station Search Response " + JSON.stringify(respobj));

        if (respobj != null && respobj.facebook != null && respobj.facebook.channels != null) {

            if (respobj.facebook.channels.channel) {

                var entries = respobj.facebook.channels.channel;

                entries.forEach((channel) => {

                    //console.log("channel: " + channel);
                    sendFBMessage(senderid, { text: channel }, userCoversationArr);

                }
				)
			};
        }
        else if (respobj != null && respobj.facebook != null && respobj.facebook.attachment != null) {
            //console.log("less than 10 channels ");

            //fix to single element array 
            if (respobj != null
				&& respobj.facebook != null
				&& respobj.facebook.attachment != null
				&& respobj.facebook.attachment.payload != null
				&& respobj.facebook.attachment.payload.elements != null) {
                try {
                    var chanls = respobj.facebook.attachment.payload.elements;

                    if (!util.isArray(chanls)) {
                        respobj.facebook.attachment.payload.elements = [];
                        respobj.facebook.attachment.payload.elements.push(chanls);
                        //logger.debug("ProgramSearchCallBack=After=" + JSON.stringify(respobj));
                    }
                } catch (err) { logger.debug('error on array list ' + err); }
            }

            sendFBMessage(senderid, respobj.facebook, userCoversationArr);
        }
        else {
            logger.debug("Sorry i dont find channel details");
            sendFBMessage(senderid, { text: "Sorry I dont find the channel details. Can you try another." }, userCoversationArr);
        }
    }
    catch (experr) {
        logger.debug('error on  station search detail : ' + experr);
    }

    logger.debug("station search completed");
}

function PgmSearch(apireq, sender, userCoversationArr, callback) {
    logger.debug("<<<Inside PgmSearch>>>");
    logger.debug("<<<sender>>>" + sender);
    try {
        var strProgram = apireq.result.parameters.Programs;
        var strGenre = apireq.result.parameters.Genre;
        var strdate = apireq.result.parameters.date;
        var strChannelName = apireq.result.parameters.Channel;
        var strFiosId = apireq.result.parameters.FiosId;
        var strStationId = apireq.result.parameters.StationId;
        var strRegionId = "";
        var intpageid = apireq.result.parameters.PageNo;
        var strTeam = apireq.result.parameters.Teams;
        var strCast = apireq.result.parameters.Cast;
        var ActualServiceId = apireq.result.parameters.ActualServiceId;

        //var headersInfo = { "Content-Type": "application/json" };

        var args = {
            json: {
                Flow: config.FlowName,
                Request: {
                    ThisValue: 'AdvProgramSearch', //'ProgramSearchNew', //  EnhProgramSearch
                    BotProviderId: sender, //'1113342795429187',  // usersession ; sender id
                    BotstrTitleValue: strProgram,
                    BotdtAirStartDateTime: strdate,
                    BotstrGenreRootId: strGenre,
                    BotstrStationCallSign: strChannelName,
                    BotstrFIOSRegionID: strRegionId,
                    BotstrFIOSID: strFiosId,
                    BotstrFIOSServiceId: strStationId,
                    BotstrCastCreditNamesRoles: strCast,
                    BotPaginationID: intpageid,
                    BotstrEpisodeTitleValue: strTeam,
                    BotstrActualFIOSServiceId: ActualServiceId
                }
            }
        };

        logger.debug("Request for Pgrm search " + JSON.stringify(args));

        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {


                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug('error on program search psting: ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on  program search psting : ' + experr);
    }

    logger.debug("Program search completed");
}

function PgmSearchCallback(apiresp, senderid, userCoversationArr) {
    logger.debug("PgmSearchCallback statted");
    var objToJson = {};
    objToJson = apiresp;
    try {
        var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
        logger.debug("subflow - PgmSearchCallback " + JSON.stringify(subflow));

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        if (subflow != null
            && subflow.facebook != null
            && subflow.facebook.attachment != null
            && subflow.facebook.attachment.payload != null
            && subflow.facebook.attachment.payload.elements != null) {
            try {
                var pgms = subflow.facebook.attachment.payload.elements;

                if (!util.isArray(pgms)) {
                    subflow.facebook.attachment.payload.elements = [];
                    subflow.facebook.attachment.payload.elements.push(pgms);

                }
            } catch (err) { logger.debug("Error on pgm search " + err); }
        }


        //fix to single element array 
        if (subflow != null
			&& subflow.facebook != null
			&& subflow.facebook.attachment != null
			&& subflow.facebook.attachment.payload != null
			&& subflow.facebook.attachment.payload.buttons != null) {
            try {
                var pgms = subflow.facebook.attachment.payload.buttons;

                if (!util.isArray(pgms)) {
                    subflow.facebook.attachment.payload.buttons = [];
                    subflow.facebook.attachment.payload.buttons.push(pgms);

                }
            } catch (err) { logger.debug("Error on pgm search " + err); }
        }

        if (subflow != null
			&& subflow.facebook != null
			&& subflow.facebook.text != null && subflow.facebook.text == 'UserNotFound') {
            logger.debug("PGM Serach subflow " + subflow.facebook.text);
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

            sendFBMessage(senderid, respobj.facebook, userCoversationArr);
        }
        else {
            sendFBMessage(senderid, subflow.facebook, userCoversationArr);
        }
    }
    catch (experr) {
        logger.debug('error on  PgmSearchCallback : ' + experr);
    }

    logger.debug("PgmSearchCallback complted");
}

function recommendations(apireq, pgmtype, senderid, userCoversationArr, callback) {
    logger.debug('inside recommendations ');
    try {
        var args = {};
        if (pgmtype == "OnNow") {
            args = {
                json: {
                    Flow: config.FlowName,
                    Request: {
                        ThisValue: 'AuthOnNow',
                        BotProviderId: senderid
                    }
                }
            };
        }
        else {
            args = {
                json: {
                    Flow: config.FlowName,
                    Request: {
                        ThisValue: 'AuthOnLater',
                        BotProviderId: senderid
                    }
                }
            };

        }
        logger.debug("request args for recommendations " + JSON.stringify(args));

        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                logger.debug("response for recoomendations " + JSON.stringify(body));
                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug('error on posting the request for recommendations : ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on  recommendations : ' + experr);
    }

    logger.debug('inside recommendations completed ');
}

function recommendationsCallback(apiresp, senderid, userCoversationArr) {
    logger.debug('inside recommendationsCallback ');
    var objToJson = {};
    objToJson = apiresp;
    try {
        var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
        logger.debug("response for recommendation " + JSON.stringify(subflow));

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

    }
    catch (err) {
        logger.debug('error formating the response recommendations : ' + err);
    }
    sendFBMessage(senderid, subflow.facebook, userCoversationArr);
    logger.debug('inside recommendationsCallback completed ');
}

function RecordScenario(apiresp, senderid, userCoversationArr) {
    logger.debug("inside RecordScenario");
    try {
        var channel = apiresp.result.parameters.Channel.toUpperCase();
        var program = apiresp.result.parameters.Programs.toUpperCase();
        var time = apiresp.result.parameters.timeofpgm;
        var dateofrecord = apiresp.result.parameters.date;
        var SelectedSTB = apiresp.result.parameters.SelectedSTB;

        logger.debug("SelectedSTB : " + SelectedSTB + " channel : " + channel + " dateofrecord :" + dateofrecord + " time :" + time);

        if (time == "") //if time is empty show schedule
        {
            PgmSearch(apiresp, senderid, userCoversationArr, function (str) { PgmSearchCallback(str, senderid, userCoversationArr) });
        }
        else if (SelectedSTB == "" || SelectedSTB == undefined) {
            STBList(apiresp, senderid, userCoversationArr, function (str) { STBListCallBack(str, senderid, userCoversationArr) });
        }
        else {  //Schedule Recording
            logger.debug(" Channel: " + apiresp.result.parameters.Channel + " Programs: " + apiresp.result.parameters.Programs + " SelectedSTB: " + apiresp.result.parameters.SelectedSTB + " Duration: " + apiresp.result.parameters.Duration + " FiosId: " + apiresp.result.parameters.FiosId + " RegionId: " + apiresp.result.parameters.RegionId + " STBModel: " + apiresp.result.parameters.STBModel + " StationId: " + apiresp.result.parameters.StationId + " date: " + apiresp.result.parameters.date + " timeofpgm: " + apiresp.result.parameters.timeofpgm);
            DVRRecord(apiresp, senderid, userCoversationArr, function (str) { DVRRecordCallback(str, senderid, userCoversationArr) });
        }
    }
    catch (experr) {
        logger.debug('error on  RecordScenario : ' + experr);
    }
    logger.debug("inside RecordScenario completed");
}

function STBList(apireq, senderid, userCoversationArr, callback) {
    logger.debug("inside STBList");

    try {
        var args = {
            json: {
                Flow: config.FlowName,
                Request: {
                    ThisValue: 'AuthSTBList',
                    BotProviderId: senderid,
                    Userid: ''
                }
            }
        };

        logger.debug('Request of STB List ' + JSON.stringify(args));
        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {


                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug('error on posting the stb list request : ' + error + ' body: ' + JSON.stringify(body));
            }
        });
    }
    catch (experr) {
        logger.debug('error on  STBList : ' + experr);
    }
    logger.debug("inside STBList completd");
}

function STBListCallBack(apiresp, senderid, userCoversationArr) {
    var objToJson = {};
    objToJson = apiresp;
    try {

        var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
        logger.debug("STBListCallBack=before=" + JSON.stringify(subflow));

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        //fix to single element array 
        if (subflow != null
			&& subflow.facebook != null
			&& subflow.facebook.attachment != null
			&& subflow.facebook.attachment.payload != null
			&& subflow.facebook.attachment.payload.buttons != null) {
            try {
                var pgms = subflow.facebook.attachment.payload.buttons;

                if (!util.isArray(pgms)) {
                    subflow.facebook.attachment.payload.buttons = [];
                    subflow.facebook.attachment.payload.buttons.push(pgms);

                }
            } catch (err) { logger.debug('error on stblistcallback - array ' + err); }
        }

        sendFBMessage(senderid, subflow.facebook, userCoversationArr);
    }
    catch (experr) {
        logger.debug('error on  STBList callback: ' + experr);
    }
}

function DVRRecord(apireq, senderid, userCoversationArr, callback) {

    logger.debug("<<< Inside DVRRecord function >>>");
    try {
        var strUserid = '';
        var args = {};

        var strProgram = apireq.result.parameters.Programs;
        var strChannelName = apireq.result.parameters.Channel;
        var strGenre = apireq.result.parameters.Genre;

        var strFiosId = apireq.result.parameters.FiosId;
        var strSeriesId = apireq.result.parameters.SeriesId;
        var strStationId = apireq.result.parameters.StationId;

        var strAirDate = apireq.result.parameters.date;
        var strAirTime = apireq.result.parameters.timeofpgm;
        var strDuration = apireq.result.parameters.Duration;

        var strRegionId = apireq.result.parameters.RegionId;
        var strSTBModel = apireq.result.parameters.STBModel;
        var strSTBId = apireq.result.parameters.SelectedSTB;
        var strVhoId = apireq.result.parameters.VhoId;
        var strProviderId = apireq.result.parameters.ProviderId;

        logger.debug(" strUserid " + strUserid + "Recording strProgram " + strProgram + " strGenre " + strGenre + " strdate " + strAirDate + " strFiosId " + strFiosId + " strSeriesId " + strSeriesId + " strStationId " + strStationId + " strAirDate " + strAirDate + " strAirTime " + strAirTime + " strSTBId " + strSTBId + " strSTBModel " + strSTBModel + " strRegionId " + strRegionId + " strDuration " + strDuration);

        //var headersInfo = { "Content-Type": "application/json" };

        if (strSeriesId != '' && strSeriesId != undefined) {
            console.log("Record Series");
            args = {
                json: {
                    Flow: config.FlowName,
                    Request: {
                        ThisValue: 'AuthRecordSeries',  //DVRSeriesSchedule
                        Userid: '',
                        BotStbId: strSTBId,
                        BotDeviceModel: strSTBModel,
                        BotstrFIOSRegionID: '',
                        BotstrFIOSID: strFiosId,
                        BotstrFIOSServiceId: strSeriesId, //yes its series id
                        BotStationId: strStationId,
                        BotAirDate: strAirDate,
                        BotAirTime: strAirTime,
                        BotDuration: strDuration,
                        BotstrTitleValue: strProgram,
                        BotVhoId: strVhoId,
                        BotProviderId: senderid, //yes sender id
                        BotstrFIOSRegionID: strRegionId
                    }
                }

            };
        }
        else {
            logger.debug("Record Episode");
            args = {
                json: {
                    Flow: config.FlowName,
                    Request: {
                        ThisValue: 'AuthRecordShow',
                        Userid: '',
                        BotStbId: strSTBId,
                        BotDeviceModel: strSTBModel,
                        BotstrFIOSRegionID: '',
                        BotstrFIOSServiceId: strFiosId,
                        BotStationId: strStationId,
                        BotAirDate: strAirDate,
                        BotAirTime: strAirTime,
                        BotDuration: strDuration,
                        BotVhoId: strVhoId,
                        BotProviderId: senderid
                    }
                }
            };
        }

        logger.debug("Request for dvr record args " + JSON.stringify(args));

        request({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json

        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                //console.log("body " + body);
                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug('error on DVR Record: ' + error + ' body: ' + body);
            }
        });
    }
    catch (experr) {
        logger.debug('error on  DVRRecord : ' + experr);
    }

    logger.debug("<<< Inside DVRRecord function complted >>>");
}

function DVRRecordCallback(apiresp, senderid, userCoversationArr) {
    var objToJson = {};
    objToJson = apiresp;
    try {
        var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

        userCoversationArr.ufdresdatetime = getDateTime();
        userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
        userCoversationArr.ufdreq = 'passed';
        printChatHistory(userCoversationArr);

        logger.debug("subflow Value -----" + JSON.stringify(subflow));
        var respobj = {};
        if (subflow != null) {
            if (subflow != null && subflow.facebook != null && subflow.facebook.result != null && subflow.facebook.result.msg != null && subflow.facebook.result.msg == "success") {
                respobj = { "facebook": { "attachment": { "type": "template", "payload": { "template_type": "button", "text": "Good news, you have successfully scheduled this recording.Did you need help finding something else to watch?", "buttons": [{ "type": "postback", "title": "YES", "payload": "Main Menu" }, { "type": "postback", "title": "NO", "payload": "No on record end" }] } } } };
                sendFBMessage(senderid, respobj.facebook, userCoversationArr);
            }
            else if (subflow != null && subflow.facebook != null && subflow.facebook.result != null && subflow.facebook.result.code != null && subflow.facebook.result.code == "9507") {
                respobj = "This Program has already been scheduled";
                sendFBMessage(senderid, { text: respobj }, userCoversationArr);
            }
            else if (subflow != null && subflow.facebook != null && subflow.facebook.result != null && subflow.facebook.result.code != null && subflow.facebook.result.code == "9117") //not subscribed
            {
                respobj = {
                    "facebook": {
                        "attachment": {
                            "type": "template", "payload":
							{
                                "template_type": "button", "text": " Sorry you are not subscribed to this channel. Would you like to subscribe ?", "buttons": [
                                    { "type": "postback", "title": "Subscribe", "payload": "Subscribe" },
                                    { "type": "postback", "title": "No, I'll do it later ", "payload": "Main Menu" }]
                            }
                        }
                    }
                };
                sendFBMessage(senderid, respobj.facebook, userCoversationArr);
            }
            else {
                logger.debug("Error occured in recording: ");
                if (subflow != null && subflow.facebook != null && subflow.facebook.result != null && subflow.facebook.result.msg != null) {
                    respobj = "I'm unable to schedule this Program now. Can you please try this later.";
                    logger.debug("Error while recording Code :" + subflow.facebook.result.code + " and Message " + subflow.facebook.result.msg);
                }
                else if (subflow != null && subflow.facebook != null && subflow.facebook.errorPage != null && subflow.facebook.errorPage.errormsg != null) {
                    respobj = "I'm unable to schedule this Program now. Can you please try this later.";
                    logger.debug("Error while recording Error Message :" + subflow.facebook.errorPage.errormsg);
                }
                else
                    respobj = "I'm unable to schedule this Program now. Can you please try this later";

                sendFBMessage(senderid, { text: respobj }, userCoversationArr);
            }
        }
        else {
            respobj = "I'm unable to schedule this Program now. Can you please try this later";
            sendFBMessage(senderid, { text: respobj }, userCoversationArr);
        }
    }
    catch (err) {
        logger.debug("Error occured in recording: " + err);
        respobj = "I'm unable to schedule this Program now. Can you please try this later";
        sendFBMessage(senderid, { text: respobj }, userCoversationArr);
    }
}

function upsell(apiresp, senderid, userCoversationArr) {
    var respstr = 'Congrats, Now you are subscribed for ' + apiresp.result.parameters.Channel + " Channel.  Now  I can help you with  TV Recommendations or Recording a program. What would you like to do?";
    var respobj =
        {
            "facebook":
            {
                "attachment":
                {
                    "type": "template",
                    "payload":
                    {
                        "template_type": "button",
                        "text": respstr,
                        "buttons":
                        [
                            {
                                "type": "postback",
                                "title": "TV Recommendations",
                                "payload": "Yes"
                            },
                            {
                                "type": "postback",
                                "title": "Record",
                                "payload": "I want to record"
                            }
                        ]
                    }
                }
            }
        };

    sendFBMessage(senderid, respobj.facebook, userCoversationArr);
}

function upgradeDVR(apiresp, senderid, userCoversationArr) {

    var purchasepin = apiresp.result.parameters.purchasepin;

    if (purchasepin != "" || purchasepin != undefined)
        var respstr = "Congrats, Your DVR is upgraded.  Now  I can help you with  TV Recommendations or Recording a program. What would you like to do?";
    else
        var respstr = "Ok, we are not upgratding the DVR now.  Now  I can help you with  TV Recommendations or Recording a program. What would you like to do?";

    var respobj =
        {
            "facebook":
            {
                "attachment":
                {
                    "type": "template",
                    "payload":
                    {
                        "template_type": "button",
                        "text": respstr,
                        "buttons":
                        [
                            {
                                "type": "postback",
                                "title": "TV Recommendations",
                                "payload": "Yes"
                            },
                            {
                                "type": "postback",
                                "title": "Record",
                                "payload": "I want to record"
                            }
                        ]
                    }
                }
            }
        }

    sendFBMessage(senderid, respobj.facebook, userCoversationArr);
}

function showOutagetickets(apireq, sender, userCoversationArr, callback) {
    logger.debug("showOutagetickets Called");
    try {
        var struserid = '';
        for (var i = 0, len = apireq.result.contexts.length; i < len; i++) {
            if (apireq.result.contexts[i].name == "sessionuserid") {
                struserid = apireq.result.contexts[i].parameters.Userid;
            }
        }
        var args = {
            json: {
                Flow: config.FlowName,
                Request:
                {
                    ThisValue: 'showOutage',
                    BotProviderId: sender
                }
            }
        };
        logger.debug(" Request for showOutagetickets json " + JSON.stringify(args));

        request.post({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(body);
                }
                else {
                    userCoversationArr.ufdreq = 'error';
                    printChatHistory(userCoversationArr);
                    logger.debug(' error on callback for showOutagetickets : ' + error + ' body: ' + JSON.stringify(body));
                }
            }
        );
    }
    catch (experr) {
        logger.debug('error on  showOutagetickets : ' + experr);
    }
    logger.debug("showOutagetickets completed");
}

function showOutageticketsCallback(apiresp, senderid, userCoversationArr) {
    var objToJson = {};
    objToJson = apiresp;

    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

    userCoversationArr.ufdresdatetime = getDateTime();
    userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
    userCoversationArr.ufdreq = 'passed';
    printChatHistory(userCoversationArr);

    logger.debug("response from showoutagetickets =" + JSON.stringify(subflow));

    if (subflow != null
        && subflow.facebook != null
        && subflow.facebook.attachment != null
        && subflow.facebook.attachment.payload != null
        && subflow.facebook.attachment.payload.buttons != null) {
        try {
            var pgms = subflow.facebook.attachment.payload.buttons;
            if (!util.isArray(pgms)) {
                subflow.facebook.attachment.payload.buttons = [];
                subflow.facebook.attachment.payload.buttons.push(pgms);
            }
        } catch (err) { logger.debug("Error on showoutagetikcets - 1" + err); }
    }

    if (subflow != null
        && subflow.facebook != null
        && subflow.facebook.text != null && subflow.facebook.text == 'UserNotFound') {
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

        sendFBMessage(senderid, respobj.facebook, userCoversationArr);
    }
    else {
        sendFBMessage(senderid, subflow.facebook, userCoversationArr);
    }
}

function showopentickets(apireq, sender, userCoversationArr, callback) {

    var args =
        {
            json:
            {
                Flow: config.FlowName,
                Request:
                {
                    ThisValue: 'ShowOpenTicket',
                    BotProviderId: sender
                }
            }
        };

    logger.debug(" Request for showopentickets " + JSON.stringify(args));

    request.post({
        url: config.UFD_rest_api,
        proxy: config.vz_proxy,
        headers: config.headersInfo,
        method: 'POST',
        json: args.json
    },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            }
            else {
                userCoversationArr.ufdreq = 'error';
                printChatHistory(userCoversationArr);
                logger.debug(' error on callback for showOpentickets : ' + error + ' body: ' + JSON.stringify(body));
            }
        }
    );
}

function showopenticketsCallback(apiresp, senderid, userCoversationArr) {
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

    userCoversationArr.ufdresdatetime = getDateTime();
    userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
    userCoversationArr.ufdreq = 'passed';
    printChatHistory(userCoversationArr);

    logger.debug("Response from showopentickets =" + JSON.stringify(subflow));

    if (subflow != null
        && subflow.facebook != null
        && subflow.facebook.attachment != null
        && subflow.facebook.attachment.payload != null
        && subflow.facebook.attachment.payload.buttons != null) {
        try {
            var pgms = subflow.facebook.attachment.payload.buttons;
            console.log("Is array? " + util.isArray(pgms))
            if (!util.isArray(pgms)) {
                subflow.facebook.attachment.payload.buttons = [];
                subflow.facebook.attachment.payload.buttons.push(pgms);
            }
        } catch (err) { logger.debug("Error in showopentickets " + err); }
    }


    if (subflow != null
        && subflow.facebook != null
        && subflow.facebook.text != null && subflow.facebook.text == 'UserNotFound') {
        console.log("showOutagetickets subflow " + subflow.facebook.text);
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

        sendFBMessage(senderid, respobj.facebook, userCoversationArr);
    }
    else {
        sendFBMessage(senderid, subflow.facebook, userCoversationArr);
    }

}

function cancelscheduledticket(apireq, sender, userCoversationArr, callback) {
    logger.debug("in cancelscheduledticket");
    var strCancelTicketNumber = apireq.result.parameters.CancelTicketNumber;
    var strTCStateCode = apireq.result.parameters.TktRegion;

    var args =
        {
            json: {
                Flow: config.FlowName,
                Request:
                {
                    ThisValue: 'CancelTicket',
                    BotProviderId: sender,
                    CancelTicketNumber: strCancelTicketNumber,
                    BotTCStateCode: strTCStateCode,
                    Platform: 'Web'
                }
            }
        };

    var strConfirmation = apireq.result.parameters.Tktcancelconfirmation;
    var isconfirm = '';

    if (strConfirmation == null || strConfirmation == undefined || strConfirmation == '') {
        var respobj =
            {
                "facebook": {
                    "attachment": {
                        "type": "template", "payload":
                        {
                            "template_type": "button",
                            "text": "Are you sure to cancel this appointment ?",
                            "buttons":
                            [
                                {
                                    "type": "postback",
                                    "title": "Cancel",
                                    "payload": "Main Menu"
                                },
                                {
                                    "type": "postback",
                                    "title": "Confirm",
                                    "payload": "Want to cancel " + strCancelTicketNumber + " statecode " + strTCStateCode + " cancel status canConfirmed"
                                }
                            ]
                        }
                    }
                }
            };

        sendFBMessage(sender, respobj.facebook, userCoversationArr)
    }
    else if (strConfirmation == 'canConfirmed') {
        request.post({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(body);
                }
                else {
                    userCoversationArr.ufdreq = 'error';
                    printChatHistory(userCoversationArr);
                    logger.debug(' error on callback for Canceltickets : ' + error + ' body: ' + JSON.stringify(body));
                }
            });
    }
}

function cancelscheduledticketCallBack(apiresp, senderid, userCoversationArr) {
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

    userCoversationArr.ufdresdatetime = getDateTime();
    userCoversationArr.ufdTimeTaken = getsecondstaken('ufd', userCoversationArr.ufdreqdatetime, userCoversationArr.ufdresdatetime);
    userCoversationArr.ufdreq = 'passed';
    printChatHistory(userCoversationArr);

    logger.debug("Response from CancelicketsCallBack=" + JSON.stringify(subflow));
    if (subflow != null
        && subflow.facebook != null
        && subflow.facebook.attachment != null
        && subflow.facebook.attachment.payload != null
        && subflow.facebook.attachment.payload.buttons != null) {
        try {
            var pgms = subflow.facebook.attachment.payload.buttons;
            if (!util.isArray(pgms)) {
                subflow.facebook.attachment.payload.buttons = [];
                subflow.facebook.attachment.payload.buttons.push(pgms);
                logger.debug("CancelopenticketsCallBack=After=" + JSON.stringify(subflow));
            }
        } catch (err) { logger.debug("Error on cancel scheduled tickets " + err); }
    }

    if (subflow != null
        && subflow.facebook != null
        && subflow.facebook.text != null && subflow.facebook.text == 'UserNotFound') {
        logger.debug("canceltickets subflow " + subflow.facebook.text);
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

        sendFBMessage(senderid, respobj.facebook, userCoversationArr);
    }
    else {
        sendFBMessage(senderid, subflow.facebook, userCoversationArr);
    }
}

function showBillInfo(apireq, sender, userCoversationArr, callback) {
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
        logger.debug(" Request for showBillInfo json " + JSON.stringify(args));

        request.post({
            url: config.UFD_rest_api,
            proxy: config.vz_proxy,
            headers: config.headersInfo,
            method: 'POST',
            json: args.json
        },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(body);
                }
                else {
                    userCoversationArr.ufdreq = 'error';
                    printChatHistory(userCoversationArr);
                    logger.debug(' error on callback for showBillInfo : ' + error + ' body: ' + JSON.stringify(body));
                }
            }
        );
    }
    catch (experr) {
        logger.debug('error on  showBillInfo : ' + experr);
    }
    logger.debug("showBillInfo completed");
}

function showBillInfoCallback(apiresp, senderid, userCoversationArr) {
    var objToJson = {};
    objToJson = apiresp;
    var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;

    logger.debug("Response from showBillInfoCallback=" + JSON.stringify(subflow));

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

        sendFBMessage(senderid, respobj.facebook, userCoversationArr);
    }
    else {
        sendFBMessage(senderid, subflow.facebook, userCoversationArr);
    }
}


// Unwanted Functionalities
/*

function sendFBSenderAction(sender, action, callback) {
    setTimeout(function () {
        request({
            url: 'https://graph.facebook.com/v2.8/me/messages',
            proxy: config.vz_proxy,
            qs: { access_token: FB_PAGE_ACCESS_TOKEN },
            method: 'POST',
            json: {
                recipient: { id: sender },
                sender_action: action
            }
        }, function (error, response, body) {
            if (error) {
                logger.debug('Error sending FB Action: ', error);
            } else if (response.body.error) {
                logger.debug('Error sending FB Action: ', response.body.error);
            }
            if (callback) {
                callback();
            }
        });
    }, 1000);
}

function demowhatshot(senderid) {
    var respobj = { "facebook": { "attachment": { "type": "template", "payload": { "template_type": "generic", "elements": [{ "title": "Family Guy", "subtitle": "WBIN : Comedy", "image_url": "http://image.vam.synacor.com.edgesuite.net/8d/53/8d532ad0e94c271f8fb153a86141de2c92ee15b0/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay", "buttons": [{ "type": "web_url", "url": "http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg", "title": "Watch Video" }, { "type": "postback", "title": "RecordNow", "payload": "Get Program info of Program: Family Guy Channel: WBIN" }] }, { "title": "NCIS", "subtitle": "USA : Action &amp; Adventure,Drama", "image_url": "http://image.vam.synacor.com.edgesuite.net/85/ed/85ed791472df3065ae5462d42560773a649fdfaf/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay", "buttons": [{ "type": "web_url", "url": "http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg", "title": "Watch Video" }, { "type": "postback", "title": "RecordNow", "payload": "Get Program info of Program: NCIS Channel: USA" }] }, { "title": "Shark Tank", "subtitle": "CNBC : Action &amp; Adventure,Drama", "image_url": "http://image.vam.synacor.com.edgesuite.net/0f/07/0f07592094a2a596d2f6646271e9cb0311508415/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay", "buttons": [{ "type": "web_url", "url": "http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg", "title": "Watch Video" }, { "type": "postback", "title": "RecordNow", "payload": "Get Program info of Program: Shark Tank Channel: CNBC" }] }, { "title": "Notorious", "subtitle": "ABC WCVB : Action &amp; Adventure,Drama", "image_url": "http://image.vam.synacor.com.edgesuite.net/ba/51/ba51ba91eafe2da2a01791589bca98c0044b6622/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay", "buttons": [{ "type": "web_url", "url": "http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg", "title": "Watch Video" }, { "type": "postback", "title": "RecordNow", "payload": "Get Program info of Program: Notorious Channel: ABC WCVB" }] }, { "title": "Chicago Med", "subtitle": "NBC WHDH : Action &amp; Adventure,Drama", "image_url": "http://image.vam.synacor.com.edgesuite.net/e1/93/e1933b6aee82a467980415c36dced6fddf64d80a/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay", "buttons": [{ "type": "web_url", "url": "http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg", "title": "Watch Video" }, { "type": "postback", "title": "RecordNow", "payload": "Get Program info of Program: Chicago Med Channel: NBC WHDH" }] }, { "title": "Modern Family", "subtitle": "CW WLVI : Action &amp; Adventure,Drama", "image_url": "http://image.vam.synacor.com.edgesuite.net/c1/58/c1586d0e69ca53c32ae64526da7793b8ec962678/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay", "buttons": [{ "type": "web_url", "url": "http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg", "title": "Watch Video" }, { "type": "postback", "title": "RecordNow", "payload": "Get Program info of Program: Modern Family Channel: CW WLVI" }] }] } } } };
    sendFBMessage(senderid, respobj.facebook);
}

function splitResponse(str) {
    if (str.length <= 320) {
        return [str];
    }

    return chunkString(str, 300);
}

function chunkString(s, len) {
    var curr = len, prev = 0;

    var output = [];

    while (s[curr]) {
        if (s[curr++] == ' ') {
            output.push(s.substring(prev, curr));
            prev = curr;
            curr += len;
        }
        else {
            var currReverse = curr;
            do {
                if (s.substring(currReverse - 1, currReverse) == ' ') {
                    output.push(s.substring(prev, currReverse));
                    prev = currReverse;
                    curr = currReverse + len;
                    break;
                }
                currReverse--;
            } while (currReverse > prev)
        }
    }
    output.push(s.substr(prev));
    return output;
}
*/