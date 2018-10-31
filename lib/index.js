'use strict';

var inherits = require('util').inherits,
	Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	https = require('https'),
	shttps = require('socks5-https-client');


exports.register = function(app) {
	var ParentTransport = app.lib.notifier.BaseNotifierTransport,
		logger = app.lib.logger('telegram notifier'),
		emojiHash = {
			done: '\u2705',
			error: '\ufe0f\u26d4\ufe0f',
			canceled: '\u26a0'
		};

	function Transport() {
		ParentTransport.call(this);
	}

	inherits(Transport, ParentTransport);

	Transport.prototype.init = function(params, callback) {
		this.token = params.token;
		this.proxy = params.proxy;
		callback();
	};

	Transport.prototype._sendMessage = function(params, callback) {
		callback = _.once(callback);

		var requestOptions = {
			host: 'api.telegram.org',
			path: '/bot' + this.token + '/sendMessage',
			headers: {'Content-Type': 'application/json'},
			method: 'POST'
		};

		if (this.proxy) {
			var proxyOptions = {
				socksHost: this.proxy.host,
				socksPort: this.proxy.port,
				socksUsername: this.proxy.username,
				socksPassword: this.proxy.password
			};

			requestOptions = _(requestOptions).extend(proxyOptions);
		}

		var httpsModule = this.proxy ? shttps : https;

		var req = httpsModule.request(
			requestOptions,
			function(res) {
				logger.log('response status code %d', res.statusCode);

				res.on('error', callback);

				var chunks = [];
				res.on('data', function(chunk) {
					chunks.push(chunk);
				});
				res.on('end', function() {
					logger.log('response %s', Buffer.concat(chunks).toString());
					callback();
				});
			}
		);

		req.on('error', callback);

		req.end(JSON.stringify({
			chat_id: params.recipient,
			text: params.message,
			parse_mode: 'HTML',
			disable_web_page_preview: true
		}));
	};

	Transport.prototype._messageTemplate = _(
		'<%- emoji %> <strong><%- build.project.name %></strong> build ' +
		'<a href="<%- baseUrl %>/builds/<%- build.id %>">[#<%- build.number %>]</a> ' +
		'initiated by <%- build.initiator.type %> is <strong><%- build.status %></strong>\n\n' +
		'scm target is <%- build.project.scm.rev %>\n\n' +
		'<% if (changes.length) { %>' +
			'scm changes:\n' +
			'<% _(changes).chain().first(20).each(function(change, index) { %>' +
				'\u2219 <%- change.author %>: <code><%- change.comment %></code>\n' +
			'<% }); %>' +
			'<% if (changes.length > 20) { %>' +
				'...\n' +
			'<% } %>' +
		'<% } else { %>' +
			'no scm changes\n' +
		'<% } %>' +
		'\n' +
		'<% if (build.status === \'error\') { %>' +
			'failed at <strong><%- build.currentStep %></strong>' +
		'<% } %>'
	).template();

	Transport.prototype.send = function(params, callback) {
		var self = this,
			build = params.build,
			changes = build.scm && build.scm.changes || [],
			recipients = build.project.notify.to.telegram;

		if (_(recipients).isEmpty()) {
			logger.log('no recipients, quit');
			return callback();
		}

		Steppy(
			function() {
				logger.log('send message to %s', recipients);

				var message = self._messageTemplate({
					build: build,
					baseUrl: app.config.http.url,
					changes: changes,
					emoji: emojiHash[build.status] || ''
				});

				var group = this.makeGroup();
				_(recipients).each(function(recipient) {
					self._sendMessage({
						recipient: recipient,
						message: message
					}, group.slot());
				});
			},
			callback
		);
	};

	app.lib.notifier.register('telegram', Transport);
};
