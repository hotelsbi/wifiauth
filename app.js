/*
OS X and iOS make a request to 
http://www.apple.com/library/test/success.html 
every time you connect to a WiFi network.

*/

var express = require('express');
var bodyParser = require('body-parser');
var mysql = require("mysql");

//var Logger = require('le_node');
function Logger(opts) {
  function writeLog(type, msg) {
    var ts = new Date().toISOString().substring(0, 19);
    console.log(ts + ' ' + type + ': ' + msg);
  }

  this.verbose = function(msg) { writeLog('verbose', msg); }
  this.info = function(msg) { writeLog('info', msg); }
  this.warning = function(msg) { writeLog('warning', msg); }
  this.error = function(msg) { writeLog('error', msg); }
} 


var log = new Logger({
 token:'b005f95f-a93c-4c6a-9fc8-14e686037622'
});

var app = express();

// set the view engine to ejs
app.set('view engine', 'ejs')

app.use("/", express.static('public'));
app.use(bodyParser.json());                        // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // to support URL-encoded bodies

var db = {
  connectionLimit : 100,
  host: "195.208.51.37",
  user: "auth",
  password: "rai4quaiZu6U",
  database: "radius",
};
var pool = mysql.createPool(db);

// var con = mysql.createConnection(db);


function formatTel(tel) {
  return '+7 (' + tel.substring(0,3) + ') ' + tel.substring(3,6) + '-' + tel.substring(6,8) + '-' + tel.substring(8,10);
}

function isAuthorized(mac, callback) {
  if (mac == demo_options.mac) {
    callback(false);
    return; 
  }
  var q = 'select * from radcheck where username = \'' + mac + '\'';
  pool.query(q, function(err, rows) {
    if(err) {
      log.error(err);
      return false;
      //throw err;
    }
    if (rows.length >= 2) {
      //console.log('Data received from radcheck: ' + rows.length);
      //console.log(rows);
      callback(true);
    }
    else {
      callback(false);
    }
  });
}

var page = 'demo';
var destination = 'http://www.wificomiten.ru';
var demo_options = {
  'identity': 'restaurant',
  'loginUrl': 'http://localhost',
  'hostname': 'localhost',
  'username': '11:22:33:444:55:66',
  'password': '11:22:33:444:55:66',
  'dst': destination,
  'tel': formatTel('1234567890'),
  'mac': '11:22:33:444:55:66',
};


function init(identity, server_name) {
  var qd = 'SELECT start_page, page FROM devices WHERE identity = "' + identity + '" AND server_name = "' + server_name + '"';
  log.verbose(qd);
  pool.query(qd, function(err, rows) {
    if (err) {
      log.error(err);
    // throw err;
    return;
    }

    log.info(rows[0]);

    if (rows[0].start_page != null) { 
      page = rows[0].start_page; 
    }
    if (rows[0].page != null) { 
      destination = rows[0].page; 
    }
  });
}

app.get('/', function (req, res) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  log.info('Demo request from: ' + ip);
  res.render(page, demo_options); 
});

app.get('/tel', function(req, res) {
  res.render('tel', demo_options);
});

app.get('/hotel', function(req, res) {
  res.render('hotel', demo_options);
});


app.post('/', function (req, res) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  log.info(ip + ' connection: identity=' + req.body.identity + ';hostname=' + req.body.hostname + ';hotspot=' + req.body['server-name'] +';mac=' + req.body.mac);

  if (typeof req.body.identity == 'undefined' ||
      typeof req.body.hostname == 'undefined' ||
      typeof req.body['server-name'] == 'undefined' ||
      req.body.mac == '\'00.00.00.00.00.00\'') {

    log.info('unknown connection');
    res.sendStatus(200);
    return;
  }

  init(req.body.identity, req.body['server-name']);

  // Check if mac authorized
  isAuthorized(req.body.mac, function(authorized) {
    if (authorized) {
      log.info('MAC ' + req.body.mac + ' is authorized');
      var loginUrl = 'http://' + req.body.hostname + '/login';
      res.render('redirect.ejs', {
        'loginUrl': loginUrl,
        'username': req.body.mac,
        'password': req.body.mac,
        'dst': destination,
      });
    }
    else {
      // mac not authorized
      var qs = 'SELECT number FROM tel_in_lock WHERE mac IS NULL OR mac=\'\' ORDER BY RAND() LIMIT 1';
      pool.query(qs, function(err, rows) {
        if(err) {
          log.error(err);
          //throw err;
          return;
        }

        //console.log('Data received from tel_in_lock:');
        //console.log(rows);
        var tel = rows[0].number;
        log.info('MAC ' + req.body.mac + ' call to ' + formatTel(tel));
        
        var qu = 'UPDATE tel_in_lock SET mac = \'' + req.body.mac + 
          '\', lock_time = now(), identity=\'' + req.body.identity + 
          '\', server_name=\'' + req.body['server-name'] + 
          '\' WHERE number = \'' + tel + '\'';

        pool.query(qu, function (err, rows) {
          if (err) {
            log.error(err);
           // throw err;
           return;
          }

          var loginUrl = 'http://' + req.body.hostname + '/login';
          log.info('Waiting for a call from: ' + req.body.mac + ' to: ' + formatTel(tel));
          
          res.render(page, {
            'loginUrl': loginUrl,
            'hostname': req.body.hostname,
            'username': req.body.mac,
            'password': req.body.mac,
            'mac': req.body.mac,
            'dst': destination,
            'tel': formatTel(tel),
          });
        });
      });
    }
  });
});


app.post('/check', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  isAuthorized(req.body.mac, function(authorized) {
    if (authorized) {
      log.info('MAC ' + req.body.mac + ' is authorized');
      res.send(JSON.stringify({'result': true}));
    }
    else {
      res.send(JSON.stringify({'result': false}));
    }
  });
});
// select * from radcheck where username = 'req.body.mac';
// select * from logins where mac='req.body.mac' and mikrotik='req.body.identity' and hotspot='req.body['server-name']' order by logintime desc limit 1'

app.listen(3000, function () {
  log.info('WiFi authentication app listening on port 3000!');
});

