var watson = require('watson-developer-cloud');
var config = require('../config/config');

var limiarRR = 0.01;
var retrieveandrank = {};

var retrieve_and_rank = watson.retrieve_and_rank({
    username: config.retrieveandrank.username,
    password: config.retrieveandrank.password,
    version: 'v1'
});

var solrParams = {
    cluster_id: config.retrieveandrank.cluster_id,
    collection_name: config.retrieveandrank.collection_name,
    wt: 'json'
};

var client = retrieve_and_rank.createSolrClient(solrParams);

retrieveandrank.getRRAnswer = function (params, res, callback) {
    console.log("Q2 > " + params.input.text);
    var query = client.createQuery().q(params.input.text).fl(['id', 'content', 'score', 'title', 'body']).start(0).rows(3);

    client.search(query, function (err, obj) {
        if (err) {
            console.log(err);
            callback(null, res);
        } else {
            if (obj.response.maxScore > limiarRR) {
                res.rr = obj;
                res.isRR = true;
                callback(err, res);
            }
            //TRATAR QUANDO NAO TEM CONFIANCA MINIMA
        }
    });
}

module.exports = retrieveandrank;
