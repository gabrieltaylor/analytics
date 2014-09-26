var express = require('express');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var moment = require('moment');
var AWS = require('aws-sdk');
var app = express();

AWS.config.loadFromPath('./config.json');
AWS.config.update({region: 'us-east-1'});


var HTTP_PORT = 3000,
    HTTPS_PORT = 4443,
    SSL_OPTS = {
      key: fs.readFileSync(path.resolve(__dirname,'.ssl/www.example.com.key')),
	  cert: fs.readFileSync(path.resolve(__dirname,'.ssl/www.example.com.cert'))
    },
    Hits = {},
    Current_minute = ''




/*
 *  Define Middleware & Utilties
 **********************************
 */
var allowCrossDomain = function(req, res, next) {
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
  }
  res.header('Access-Control-Allow-Credentials', true);
  // send extra CORS headers when needed
  if ( req.headers['access-control-request-method'] ||
    req.headers['access-control-request-headers']) {
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Max-Age', 1728000);  // 20 days
    // intercept OPTIONS method
    if (req.method == 'OPTIONS') {
        res.send(200);
    }
  }
  else {
      next();
  }
};

// trim string value and enclose it with double quotes if needed
var parseValue = function(value) {
  if (typeof value === "string") {
    // trim
    value = value.replace(/^\s+|\s+$/g, '');
    if (value == "") {
      value = '""';
    } else if (value.split(' ').length > 1) {
      // enclose with "" if needed
      value = '"' + value + '"';
    }
  }
  return value;
}

// decode and parse query param param
var parseDataQuery = function(req, debug) {
  if (!req.query.data) {
    if (debug) { console.error('No \'data\' query param defined!') };
    return false;
  }
  var data = {};
  try {
    data = JSON.parse(decodeURIComponent(req.query.data));
  } catch (e) {
    if (debug) { console.error('Failed to JSON parse \'data\' query param') };
    return false;
  }
  return data;
}

// create single event based on data which includes time, event & properties
var createAndLogEvent = function(data, req) {
  var time = (data && data.t) || new Date().toISOString(),
      event = (data && data.e) || "unknown",
      properties = (data && data.kv) || {};


  // append some request headers (ip, referrer, user-agent) to list of properties
  properties.ip = req.ip;
  properties.origin = (req.get("Origin")) ? req.get("Origin").replace(/^https?:\/\//, '') : "";
  properties.page = req.get("Referer");
  properties.useragent = req.get("User-Agent");

  var minute = String(getMinute());
  console.log(minute);
  if (minute !== Current_minute){
    push_to_db(Current_minute);
    Current_minute = minute;
    Hits[minute] = {}
  }

  var id = properties.ip
  // dict[key] = (dict[key] || 0) + 1;
  Hits[minute][String(id)] = (Hits[minute][String(id)] || {})
  Hits[minute][String(id)]['hits'] = (Hits[minute][String(id)]['hits'] || 0) +1
  console.log(Hits[minute][String(id)]);
  console.log(Hits[minute][String(id)]['hits']);
  console.log(Hits[minute]);
  console.log(Object.keys(Hits[minute]).length);

  // log event data in splunk friendly timestamp + key/value(s) format
  // var entry = time + " event=" + parseValue(event);
  // for (var key in properties) {
  //   var value = parseValue(properties[key]);
  //   entry += " " + key + "=" + value;
  // }
  // entry += "\n";
  // fs.appendFile(path.resolve(__dirname, './events.log'), entry, function(err) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     //console.log("Logged tracked data");
  //   }
  // });
}

var push_to_db = function(minute) {
  var dynamoDB = new AWS.DynamoDB();
  if(minute !== ''){
    console.log("Hello");
    console.log(minute);
    // console.log(Hits[minute].length);
    // for (i = 0; i < Object.keys(Hits[key]).length; i++) { 
    for (item in Hits[minute]) { 
    console.log('item');
    console.log(item);
    console.log(Hits[minute][item]);
    console.log(Hits[minute][item].hits);
    console.log(JSON.stringify(item['hits']));
    // console.log(Hits[minute][item]);JSON.stringify(Hits[minute][item])
    dynamoDB.updateItem(
    {
      "TableName":"ip_address",
      "Key":
          {
            "address" : {"S": item},
            "minute"  : {"N": minute}
          },
      "AttributeUpdates"  : {  "Hits"  : {"Value":{"N": String(Hits[minute][item].hits)},
                                     "Action": "ADD"}
          },
      "ReturnValues"          : "ALL_NEW"
    }, 
    function(err, res, cap) {
      if (err !== null) {
        console.log(err);
      }
      if (res !== null) {
        console.log(res);
      }
      if (cap !== null) {
        console.log(cap);
      }
    });
    console.log(" Item are succesfully intest in table .................."); 
    }
  }
}

var getMinute = function() {
  // var date = new Date;
  // date.setTime(date.getTime());

  // var seconds = date.getSeconds();
  // var minutes = date.getMinutes();
  // var hour = date.getHours();

  // var year = date.getFullYear();
  // var month = date.getMonth(); // beware: January = 0; February = 1, etc.
  // var day = date.getDate();

  // var dayOfWeek = date.getDay(); // Sunday = 0, Monday = 1, etc.
  // var milliSeconds = date.getMilliseconds();

  // console.log([minute, hour, day, month, year].join(":"));
  return moment().seconds(0).milliseconds(0).format('X');
}

/*
 * Use Middlewares
 **********************************
 */
app.use(express.logger());
//app.use(express.compress());
app.use(allowCrossDomain);
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

/*
 *  Create Tracking Endpoints
 **********************************
 */

// API endpoint tracking
app.get('/track', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  var data;
  // data query param required here
  if ((data = parseDataQuery(req, true)) === false) {
    res.send('0');
  }
  createAndLogEvent(data, req);
  res.send('1');
});

// IMG beacon tracking - data query optional
app.get('/t.gif', function(req, res) {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'private, no-cache, no-cache=Set-Cookie, proxy-revalidate');
  res.setHeader('Expires', 'Sat, 01 Jan 2000 12:00:00 GMT');
  res.setHeader('Pragma', 'no-cache');
  // data query param optional here
  var data = parseDataQuery(req) || {};
  // fill in default success event if none specified
  if (!data.e) { data.e = "success";}
  createAndLogEvent(data, req);
  res.sendfile(path.resolve(__dirname, './t.gif'));
});

// root
app.get('/', function(req, res) {
  res.send("");
});

var pidFile = path.resolve(__dirname, './pid.txt');
fs.writeFileSync(pidFile, process.pid, 'utf-8'); 

// Create an HTTP service.
http.createServer(app).listen(HTTP_PORT,function() {
  console.log('Listening to HTTP on port ' + HTTP_PORT);
});

// Create an HTTPS service identical to the HTTP service.
https.createServer(SSL_OPTS, app).listen(HTTPS_PORT,function() {
  console.log('Listening to HTTPS on port ' + HTTPS_PORT);
});
