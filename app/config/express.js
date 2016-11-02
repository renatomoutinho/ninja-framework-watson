'use strict';

// Module dependencies
var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var path = require('path');
var cookieParser = require('cookie-parser');
var os = require('os');

module.exports = function(app) {
	app.use(bodyParser.urlencoded({	extended: true,	limit: '40mb' }));
	app.use(bodyParser.json({ limit: '40mb' }));
	app.use(express.static(path.join(__dirname, '../..', 'public')));

	// Setup the upload mechanism
	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			cb(null, os.tmpdir());
		},
		filename: function(req, file, cb) {
			cb(null, Date.now() + '-' + file.originalname);
		}
	});

	var upload = multer({
		storage: storage
	});

	app.upload = upload;
};
