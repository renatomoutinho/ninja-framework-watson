var wdc = require('watson-developer-cloud');
var config = require('../config/config');
var dashdb = require('../helpers/dashdb');
var util = require('../helpers/util');
var retrieveandrank = require('./retrieveandrank');

var conversation = {};
var _contexto;
var limiarNLC = 0.5;

var wdc_conversation = wdc.conversation({
    username: config.conversation.username,
    password: config.conversation.password,
    version: 'v1',
    version_date: config.conversation.versiond
});
var workspace = config.conversation.workspace;

conversation.call = function(message, callback){
	var payload = conversation.mountParams(message);
	wdc_conversation.message(payload, function (err, res) {
		if (err) {
			console.log(JSON.stringify(err));
			callback(err, res);
		}

		if(res.context != null)	_contexto = res.context;

		var qid = util.hashCode(Math.abs(Date.now()).toString() + res.context.conversation_id);
        res.qid = qid;

		if (res != null && res.intents.length > 0) {
            if (config.retrieveandrank.active && (res.output.text == config.convflags.userar || res.intents[0].confidence < limiarNLC)) {
                retrieveandrank.getRRAnswer(payload, res, function (err, resrr) {
					if(err) console.log("[ERR] " + err);
					else{
						console.log(JSON.stringify(resrr));
						dashdb.saveLog(resrr.qid,dashdb.mountParams(resrr, resrr.rr.response.docs[0].body, 1));
                    	callback(err, resrr);
					}
                });
            } else {
                dashdb.saveLog(qid,dashdb.mountParams(res, null, 0));
                callback(err, res);
            }
        } //Erro: resposta do conversation veio vazia
	});
}

conversation.mountParams = function(message){
    var params = { input: message };
	if(_contexto) params.context = _contexto;
	var payload = { workspace_id: workspace	};

	if (params) {
		if (params.input) {
			params.input = params.input.replace("\n","");
			payload.input = { "text": params.input };
		}
		if (params.context)
			payload.context = params.context;
	}
    return payload;
}

module.exports = conversation;