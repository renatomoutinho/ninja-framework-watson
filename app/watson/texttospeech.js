var watson = require('watson-developer-cloud');
var config = require('../config/config');

var TTS = {};

var text_to_speech = watson.text_to_speech({
    version: 'v1',
    username: config.texttospeech.username,
    password: config.texttospeech.password
});

TTS.sintetizar = function (message) {

    var params = {
		text: message,
		voice: config.texttospeech.model,
		accept: 'audio/wav'
	};
    console.log("TTS");
    return text_to_speech.synthesize(params);
};

module.exports = TTS;
