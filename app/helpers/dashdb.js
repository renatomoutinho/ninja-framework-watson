var async = require('asyncawait/async');
var await = require('asyncawait/await');
var Promise = require('bluebird');
var ibmdb = require('ibm_db');

var config = require("../config/config");

var db2;
var hasConnect = false;

if (process.env.VCAP_SERVICES) {
    var env = JSON.parse(process.env.VCAP_SERVICES);
    if (env['dashDB']){
        hasConnect = true;
        db2 = env['dashDB'][0].credentials;
    }
}

if (hasConnect == false) {
    db2 = {
        db: config.database.db,
        hostname: config.database.hostname,
        port: config.database.port,
        username: config.database.username,
        password: config.database.password
    };
}

var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;

exports.select = async (function(params, callback){
    return await(_select(params));
});

exports.saveLog = function (qid,values) {
    _log(qid,values).then(function(result) {
        return true;
    }).catch(function Error(error) {
        return false;
    });
};

exports.mountParams = function (convResults, rrAnswer, isRR) {
    var values = "";
    values = values + convResults.context.conversation_id;
    values = values + "','" + convResults.input.text;
    values = values + "','" + (isRR == 1 ? rrAnswer : convResults.output.text);
    values = values + "','" + (convResults.intents.length > 0 ? convResults.intents[0].intent : null);
    values = values + "','" + (convResults.intents.length > 0 ? convResults.intents[0].confidence.toString().substring(0,4) : null);
    values = values + "','" + (convResults.entities.length > 0 ? convResults.entities[0].entity : null);
    values = values + "','" + (convResults.entities.length > 0 ? convResults.entities[0].value : null);
    values = values + "','" + isRR + "'";
    return values;
}


function _log(qid,values) {
    var tabela = config.database.histtable;
    var var_columns = "QID,TIMESTAMP,CONVERSATION_ID,QUESTION,ANSWER,INTENT,INTENT_CONF,ENTITY,ENTITY_VALUE,IS_RR,CORRECT";
    var var_values = "'" + qid + "',CURRENT_TIMESTAMP,'" + values + ",'-1'";

    var q = "INSERT INTO " + tabela + "(" + var_columns + ") VALUES (" + var_values + ");";
    //console.log(q);
    return _executeQuery(q);
}

function _updateLog(params,callback) {
    var var_column = "CORRECT";
    var valores = (params.correct == true ? 1 : 0);
    var condition = "QID = '" + params.qid + "'";
    var tabela = config.database.histtable;

    var q = "UPDATE " + tabela + " SET " + var_column + " = '" + valores + "' WHERE " + condition + ";";
    _executeQuery(q);
}

function _select(params){
    var cpf = params.user_cpf.replace(/^([0-9]{3})[\.]?([0-9]{3})[\.]?([0-9]{3})[-]?([0-9]{2})/, '$1.$2.$3-$4');
    var q = "SELECT " + params.type + " FROM WGOV_CRM WHERE CPF = '" + cpf + "'";
    var result = _executeQuery(q);
    return result;
}

function _executeQuery(query){
    return new Promise(function ExecuteDBRequest(resolve, reject) {
        ibmdb.open(connString, function (err, conn) {
            if (err) {
                console.log(err);
                reject(err.message);
            } else {
                conn.query(query, function (err, rows, moreResultSets) {
                    if (!err) resolve(rows);
                    else{
                        console.log("[ERR]" + err);
                        reject(err);
                    }
                    conn.close();
                });
            }
        });
    });
}
