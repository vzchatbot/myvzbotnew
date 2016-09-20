var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');



var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var PORT = process.env.PORT || 9000;

var router = express.Router();

var headersInfo = { "Content-Type": "application/json" };
var Client = require('node-rest-client').Client;
var client = new Client();
var args = {
    "headers": headersInfo
};



router.get('/webhook', function (req, res) {

    var req1 = client.get("https://myvzbot.herokuapp.com/api/vzwhatshot", args, function (data, response) {

        console.log("recommendTVNew");

        res.on('data', function (chunk) {
            res.json(data);
            // process utf8 text chunk
        });

    });

});

function recommendTVNew(callback) {

    var req = client.post("https://myvzbot.herokuapp.com/api/vzwhatshot", args, function (data, response) {

        console.log("recommendTVNew");
        callback(data);

    });

   
}
function recommendTVNew1(apiresp) {
    var objToJson = {};
    objToJson = apiresp;

    //var output = eval('(' + JSON.stringify(apiresp) + ')');
    console.log("apiresp1:" + JSON.stringify(objToJson));
    //console.log("output1:" + output);
   // var parsedResponse = JSON.parse(apiresp);


    //console.log(aa);
    //return objToJson;

    return ({
        speech: "Here are some recommendations for tonight",
        displayText: "TV recommendations",
        data: apiresp,
        source: "Zero Service - app_zero.js"
    });

}


router.get('/vzwhatshot', function (req, res) {

    console.log("vzwhatshot");

    var req = client.post("https://www98.verizon.com/Ondemand/api/utilWebAPI/GetWhatsHot", args, function (data, response) {

        console.log("vzwhatshot1");
        res.json(data);

    });

});




// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT);
});
