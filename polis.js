
var express = require('express');

var request = require('request');




var app = express();

var PORT = process.env.PORT || 9000;

var router = express.Router();




router.get('/webhook', function (req, res) {

    request.post(
        'https://www98.verizon.com/Ondemand/api/utilWebAPI/GetWhatsHot',
        { json: { key: 'value' } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                res.json(body);
            }
        }
    );

});


// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT);
});

