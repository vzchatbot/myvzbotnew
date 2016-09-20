
var express = require('express');

var request = require('request');
var cors = require('cors');

var http = require('https');

var app = express();

var PORT = process.env.PORT || 9000;

var router = express.Router();

app.use(cors())
app.options('*', cors());


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



// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT);
});

