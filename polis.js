
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

var app = express();
var PORT = process.env.PORT || 9000;
var router = express.Router();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

router.get('/webhook', function (req, res) {
    var intent = "showrecommendation";
    switch (intent) {
        case "showrecommendation":
            recommendTVNew(function (str) {
                console.log("inside showrecommendation ");
                res.json(recommendTVNew1(str));
            });
    }   
});

router.post('/webhook', function (req, res) {
	var intent = req.body.result.action;
    switch (intent) {
        case "showrecommendation":
            recommendTVNew(function (str) {
                console.log("inside showrecommendation ");
                res.json(recommendTVNew1(str));
            });
    }
});


function recommendTVNew(callback) {
	var headersInfo = { "Content-Type": "application/json" };
	
	var args = {
		"headers": headersInfo,
		"json": {
			Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			Request: {
				ThisValue: 'Trending'
			}
		}
	};

    request.post(
        'https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx', args,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(body);
            }
        }
    );
}

function recommendTVNew1(apiresp) {
    var objToJson = {};
    objToJson = apiresp;
    
   // console.log("apiresp1:" + JSON.stringify(objToJson));
    //console.log("output1:" + output);
    //var parsedResponse = JSON.parse(apiresp);

	var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;	

	console.log("subflow :" + subflow)
    
    return ({
        speech: "Here are some recommendations for tonight",
        displayText: "TV recommendations",
        data: subflow,
        source: "Zero Service - app_zero.js"
    });

}


// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(3000, function () {
    console.log('Listening on port ' + PORT);
});

