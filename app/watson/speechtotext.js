var watson = require('watson-developer-cloud');
var request = require('request');
var fs = require('fs');
var https = require('https');
var tmp = require('tmp');
var ffmpeg = require('fluent-ffmpeg');
var config = require('../config/config');

var STT = {};

var speech_to_text = watson.speech_to_text({
    version: 'v1',
    username: config.speechtotext.username,
    password: config.speechtotext.password
});

STT.text = function (url, cb) {
    tmp.file({postfix: '.aac'}, function _tempFileCreated (err, input, fd) {
        if (err) throw err;

        tmp.file({postfix: '.wav'}, function _tempFileCreated (err, output, fd) {
            if (err) throw err;

            save_to_file(url, input, function () {
                convert_mp3_to_wav(input, output, function () {
                    convert_speech_to_text(output, cb);
                })
            })
        })
    })
}

var convert_mp3_to_wav = function(input,output,cb){
    console.log("START convert_mp3_to_wav");

    new ffmpeg(input)
        .format('wav')
        .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine); 
        })
        .on('progress', function(progress) {
            console.log('Processing: ' + progress.percent + '% done');
        })
        .on('codecData', function(data) {
            if(data) console.log('F > '+ data.format + 'D > ' + data.duration + ' AND Input is ' + data.audio + ' audio ' + 'with ' + data.audio_details + ' details');
        })
        .on('end', function() {
            console.log('file has been converted succesfully');
            cb();
        })
        .on('stderr', function(stderrLine) {
            console.log('Stderr output: ' + stderrLine);
        })
        .on('error', function(err, stdout, stderr) {
            console.log('an error happened: ' + err.message, stdout, stderr);
        })
        .save(output);
        console.log("END convert_mp3_to_wav");
}

var convert_speech_to_text = function (audio, cb) {
    console.log("START convert_speech_to_text");
    var _audio = fs.createReadStream(audio);
    var params = {
        audio: _audio,
        content_type: 'audio/wav',
        model: "pt-BR_NarrowbandModel"
    }
    console.log("MOUNT PARAMS convert_speech_to_text > " + JSON.stringify(params));
    _audio.on('close', function (err) {
        console.log('2. Stream has been destroyed and file has been closed');
    });    

    console.log("RECOG convert_speech_to_text");

    speech_to_text.recognize(params, function (err, res) {
        if (err) {
            console.log("ERR > " + err);
            return ;
        }

        var result = res.results[res.result_index];
        var question = '';

        if (result) {
            question = result.alternatives[0].transcript;
        }

        cb(null,question);
    })
}

var save_to_file = function (url, path, cb) {
    https.get(url, function (res) {
        console.log("START save_to_file");
        var output = fs.createWriteStream(path);
        res.pipe(output);
        console.log("PIPED save_to_file");

        output.on('close', function (err) {
            console.log('1. Stream has been destroyed and file has been closed');
        });    

        res.on('end', function () {
            console.log("END save_to_file");
            cb();
        });


    })
}

module.exports = STT;
