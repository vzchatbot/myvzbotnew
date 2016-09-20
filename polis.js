
var express = require('express');

var request = require('request');


var http = require('https');

var app = express();

var PORT = process.env.PORT || 9000;

var router = express.Router();




router.get('/webhook', function (req, res) {

    request('/api/vzwhatshot1', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.json(body);
        }
    })

   

});
app.all('*', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
});


router.get('/vzwhatshot1', function (req, res) {
    
    var options = {
        host: 'www98.verizon.com',
        port: 443,
        path: '/Ondemand/api/utilWebAPI/GetWhatsHot'
    };

    http.get(options, function (resp) {
       
        resp.setEncoding('utf8');
        resp.on('data', function (chunk) {
           
            res.json(chunk);
        });
    }).on("error", function (e) {
        console.log("Got error: " + e.message);
    });

});

// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT);
});

