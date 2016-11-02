var wdc = require('watson-developer-cloud');
var https = require('https');
var tmp = require('tmp');
var fs = require('fs');

var config = require('../config/config');

var visual_recognition = wdc.visual_recognition({
    api_key: config.visualrecognition.apikey,
    version: 'v3',
    version_date: '2016-05-20'
});

var visualrecog = {};

visualrecog.classificar = function(url, cb){
    var params = {
        classifier_ids: [config.visualrecognition.customclassifierid, "default"],
        url: url
    };

    visual_recognition.classify(params, function(err, res) {
        if (err) cb(err, res);
        else cb(null,res);
    });
};

module.exports = visualrecog;