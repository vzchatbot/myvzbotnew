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


router.get('/vzwhatshot', function (req, res) {

    console.log("vzwhatshot");

    request('https://www98.verizon.com/Ondemand/api/utilWebAPI/GetWhatsHot', function (error, response, body) {
        if (!error && response.statusCode == 200) {

            console.log("vzwhatshot1");
            res.set('Content-Type', 'application/json');
            res.json(body);
        }
    })

   

});




// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT);
});
