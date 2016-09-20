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

router.post('/webhook', function (req, res) {

    var req = client.post("https://www98.verizon.com/foryourhome/vzrepair/flowengine/vzwhatshot.ashx", args, function (data, response) {

        var parsedData = "";
        console.log("success1");
            parsedData = JSON.parse(data);
            res.json(parsedData);
           
    });

     
});

router.get('/webhook', function (req, res) {

  

    var req = client.post("https://www98.verizon.com/foryourhome/vzrepair/flowengine/vzwhatshot.ashx", args, function (data, response) {

        var parsedData = "";
        console.log("success1");
       
        res.json(parsedData);

    });


});

router.get('/vzwhatshot', function (req, res) {
    var yourJson = "'facebook': { 'attachment': { 'type': 'template','payload': { 'template_type': 'generic','elements': [{'title': 'Shark Tank','subtitle': 'Shark Tank','image_url': 'http://image.vam.synacor.com.edgesuite.net/0f/07/0f07592094a2a596d2f6646271e9cb0311508415/w=414,h=303,crop=auto/?sig=88c390c980d4fa53d37ef16fbdc53ec3dfbad7d9fa626949827b76ae37140ac3&amp;app=powerplay','buttons': [    {'type': 'web_url','url': 'http://www.youtube.com/embed/SQ1W7RsXL3k','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'    }]    },    {'title': 'Game of Thrones','subtitle': 'Game of Thrones','image_url': 'http://ia.media-imdb.com/images/M/MV5BMjM5OTQ1MTY5Nl5BMl5BanBnXkFtZTgwMjM3NzMxODE@._V1_UX182_CR0,0,182,268_AL_.jpg','buttons': [    {'type': 'web_url','url': 'https://www.youtube.com/watch?v=36q5NnL3uSM','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'    }]    },    {'title': 'The Night Of','subtitle': 'The Night Of','image_url': 'http://ia.media-imdb.com/images/M/MV5BMjQyOTgxMDI0Nl5BMl5BanBnXkFtZTgwOTE4MzczOTE@._V1_UX182_CR0,0,182,268_AL_.jpg','buttons': [    {'type': 'web_url','url': 'https://www.youtube.com/watch?v=36q5NnL3uSM','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'}]}]}}}";
    console.log("vzwhatshot");
        res.json(yourJson);

    });
router.post('/vzwhatshot', function (req, res) {
    var yourJson = "'facebook': { 'attachment': { 'type': 'template','payload': { 'template_type': 'generic','elements': [{'title': 'Shark Tank','subtitle': 'Shark Tank','image_url': 'http://image.vam.synacor.com.edgesuite.net/0f/07/0f07592094a2a596d2f6646271e9cb0311508415/w=414,h=303,crop=auto/?sig=88c390c980d4fa53d37ef16fbdc53ec3dfbad7d9fa626949827b76ae37140ac3&amp;app=powerplay','buttons': [    {'type': 'web_url','url': 'http://www.youtube.com/embed/SQ1W7RsXL3k','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'    }]    },    {'title': 'Game of Thrones','subtitle': 'Game of Thrones','image_url': 'http://ia.media-imdb.com/images/M/MV5BMjM5OTQ1MTY5Nl5BMl5BanBnXkFtZTgwMjM3NzMxODE@._V1_UX182_CR0,0,182,268_AL_.jpg','buttons': [    {'type': 'web_url','url': 'https://www.youtube.com/watch?v=36q5NnL3uSM','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'    }]    },    {'title': 'The Night Of','subtitle': 'The Night Of','image_url': 'http://ia.media-imdb.com/images/M/MV5BMjQyOTgxMDI0Nl5BMl5BanBnXkFtZTgwOTE4MzczOTE@._V1_UX182_CR0,0,182,268_AL_.jpg','buttons': [    {'type': 'web_url','url': 'https://www.youtube.com/watch?v=36q5NnL3uSM','title': 'Watch video'    },    {'type': 'web_url','url': 'https://m.verizon.com/myverizonmobile/router.aspx?token=tvlisting','title': 'Record'}]}]}}}";
    console.log("vzwhatshot");
    res.json(yourJson);

});



// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

app.use('/api', router);
app.listen(PORT, function () {
    console.log('Listening on port ' + PORT) ;
});
