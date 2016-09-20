
var express = require('express');
var request = require('request');
var cors = require('cors');
var http = require('https');
var app = express();
var PORT = process.env.PORT || 9000;
var router = express.Router();
app.use(cors())
app.options('*', cors());

router.get('/webhook', function (req, res) {

    var intent = req.body.result.metadata.intentName;

    switch (intent) {

        case "showrecommendation":
          

            recommendTVNew(function (str) {
                console.log("inside showrecommendation ");
                res.json(recommendTVNew1(str));
            });

    }   

});

function recommendTVNew(callback) {
    request.get(
        'https://www.verizon.com/fiostv/myservices/admin/testwhatshot.ashx',
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
    
    console.log("apiresp1:" + JSON.stringify(objToJson));
    //console.log("output1:" + output);
    var parsedResponse = JSON.parse(apiresp);
    
    return ({
        speech: "Here are some recommendations for tonight",
        displayText: "TV recommendations",
        data: parsedResponse,
        source: "Zero Service - app_zero.js"
    });

}

// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT);
});

