
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

    request('/api/vzwhatshot1', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.json(body);
        }
    })

   

});

router.get('/webhook1', function (req, res) {

    request('www.verizon.com/fiostv/myservices/admin/testwhatshot.ashx', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.json(body);
        }
    })



});



router.get('/webhook2', function (req, res) {

    request('https://www98.verizon.com/Ondemand/api/PPVWebAPI/GetPPVEvents?Genre=&StartDate=09%2F20%2F2016&StartTime=11%3A38+AM&PriceStart=0&PriceEnd=100000&intCurrentPage=1&sort_OrderbyColumn=StartDate+asc&SearchTitle=&_=1474389539047', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.json(body);
        }
    })



});

router.get('/vzwhatshot2', function (req, res) {

    var options = {
        host: 'www.verizon.com',
        port: 443,
        path: '/fiostv/myservices/admin/testwhatshot.ashx'
    };

    http.get(options, function (resp) {

        resp.setEncoding('utf8');
        resp.on('data', function (chunk) {

            res.json(chunk);
        });
    });

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
    });

});

// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT);
});

