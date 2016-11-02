var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var tbot = require('node-telegram-bot-api');
var watson = require('watson-developer-cloud');

var config 		 = require('./app/config/config');
var lines 		 = require('./app/config/lines');
var visualrecog  = require('./app/watson/visualrecognition');
var conversation = require('./app/watson/conversation');
var tts 		 = require('./app/watson/texttospeech');
var stt 		 = require('./app/watson/speechtotext');
var facebot 	 = require('./app/helpers/facebot');
var modBoleto 	 = require('./app/boleto');

var app = express();

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Inicializa o Bot do Facebook
var bot = new facebot({
    page_token: config.facebook.page_token,
    verify_token: config.facebook.verify_token
});
app.use('/webhook', bot.middleware());

bot.on('message', function(userId, message){
	console.log("ENTROU_00");
	bot.getUserProfile(userId, function (err, profile) {
		console.log("USER > " + JSON.stringify(profile));
	});
	conversation.call(message,function(err,resposta){
		orquestrador(resposta, userId);
	});
});

bot.on('attachment', function(userId, attachment){
	console.log("ENTROU_01");
    if (attachment[0].type == "audio") {
		console.log("AUDIO URL > " + attachment[0].payload.url);
		stt.text(attachment[0].payload.url,function(err,resposta){
			if(err){
				var url = config.system.url + lines.urlErroAudio;
        		bot.sendAudioAttachment(userId, url);
			}else{
				bot.sendTextMessage(userId, "Entendi que você disse: " + resposta);
			}
		});	
    } else if (attachment[0].type == "image") {
		console.log("ENTROU_02");
		visualrecog.classificar(attachment[0].payload.url,function(err,res){
			if(err || !res.images[0] || res.images[0].classifiers == undefined || res.images[0].classifiers == "undefined" || res.images[0].classifiers[0].classes == "undefined") 
				bot.sendTextMessage(userId, "Não foi possível classificar essa imagem.");
			else{
				console.log("ENTROU_03");
				var c_class = res.images[0].classifiers[0].classes[0].class;
				var c_class2 = res.images[0].classifiers[0].classes[1].class;
				console.log("Class > " + c_class);
				console.log("Class2 > " + c_class);
				if(c_class == "dog" || c_class == "animal"){
					bot.sendTextMessage(userId, "Ah ta, sendo assim temos várias opções de acordo com a idade do seu cão... Por favor acesso o link para maiores informações: https://www.health4pet.com.br");
					bot.sendTextMessage(userId, "Você tem mais alguma dúvida?");
				}else if(c_class == "car"){
					bot.sendTextMessage(userId, "Humm, este não é um cãozinho, mas também temos várias opções de seguro para veículos. Confira na nossa página: http://www.portoseguro.com.br");
					bot.sendTextMessage(userId, "Posso te ajudar com mais alguma coisa?");
				}else if(c_class == "animal"){
					bot.sendTextMessage(userId, "//INSERIR MENSAGEM PRA ANIMAL GERAL");
					bot.sendTextMessage(userId, "Posso te ajudar com mais alguma coisa?");
				}
			}
				
		});
	}
});

// Inicializa o bot do Telegram
var telegramBot = new tbot(config.telegram.apikey, { polling: true });

telegramBot.on('message', function (msg) {
    if(msg['voice']){ 
		return onVoiceMessage(msg); 
	}
});

app.get('/tts/synthesize', function (req, res, next) {
	tts.sintetizar(req.query.text).pipe(res);
});

app.get('/boleto', function (req, res) {
	var params = { cpf: req.query.cpf }
	modBoleto.createBoleto(params, function (err, results) {
		if (err) res.send('Erro ao gerar o boleto.');
		res.send(results);
	});
});
 
function orquestrador(respostaJSON, userId) {

	if(respostaJSON != null && respostaJSON.isRR){
		bot.sendTextMessage(userId, respostaJSON.rr.response.docs[0].body);
	}else if(respostaJSON != null && respostaJSON.output != null){
		for(var i=0; i < respostaJSON.output.text.length; i++){
			var resposta = respostaJSON.output.text[i].toString();
		
			if(resposta == config.convflags.boleto){
				linkurl = config.system.url + "/boleto?cpf=" + respostaJSON.context.user_cpf;
				messageData = modBoleto.generateFBResponse(linkurl,"Para visualizar seu novo boleto clique no botão");
				bot.sendGenericMessage(userId, messageData);
			}else{
				bot.sendTextMessage(userId, resposta);
				if(config.texttospeech.active){
					var url = config.system.url + "/tts/synthesize?text=" + encodeURI(resposta);
					bot.sendAudioAttachment(userId, url);
				}
			}
		}
	}
}

// POLUINDO O CODIGO PRA TESTE COM TELEGRAM ='(
var speech_to_text = watson.speech_to_text({
    version: 'v1',
    username: config.speechtotext.username,
    password: config.speechtotext.password
});

var params = {
    model: 'pt-BR_BroadbandModel',
    content_type: 'audio/ogg;codecs=opus',
    continuous: true,
    interim_results: false
};

function onVoiceMessage(msg){
    var chatId = msg.chat.id;
    telegramBot.getFileLink(msg.voice.file_id).then(function(link){
        //setup new recognizer stream
        var recognizeStream = speech_to_text.createRecognizeStream(params);
        recognizeStream.setEncoding('utf8');
        recognizeStream.on('results', function(data){
        if(data && data.results && data.results.length>0 && data.results[0].alternatives && data.results[0].alternatives.length>0){
            var result = data.results[0].alternatives[0].transcript;
            console.log("result: ", result);
            //send speech recognizer result back to chat
            telegramBot.sendMessage(chatId, result, {
                disable_notification: true,
                reply_to_message_id: msg.message_id
            }).then(function () {
                // reply sent!
            });
        }
    });

    ['data', 'error', 'connection-close'].forEach(function(eventName){
    	recognizeStream.on(eventName, console.log.bind(console, eventName + ' event: '));
    });
    
    //pipe voice message to recognizer -> send to watson
    request(link).pipe(recognizeStream);
 });
}

app.listen(config.system.port, config.system.host);