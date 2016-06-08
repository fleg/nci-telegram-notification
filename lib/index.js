'use strict';

var	inherits = require('util').inherits,
	Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	https = require('https');


exports.register = function(app) {
	var ParentTransport = app.lib.notifier.BaseNotifierTransport,
		logger = app.lib.logger('telegram notifier');

	function Transport() {
		ParentTransport.call(this);
	}

	inherits(Transport, ParentTransport);

	Transport.prototype.init = function(params, callback) {
		this.token = params.token;
		callback();
	};

	Transport.prototype._sendMessage = function(params, callback) {
		callback = _.once(callback);

		var req = https.request({
			host: 'api.telegram.org',
			path: '/bot' + this.token + '/sendMessage',
			headers: {'Content-Type': 'application/json'},
			method: 'POST'
		}, function(res) {
			res.on('end', callback);
		});

		req.on('error', callback);

		req.end(JSON.stringify({
			chat_id: params.recipient,
			text: params.message,
			parse_mode: 'Markdown',
			disable_web_page_preview: true
		}));
	};

	Transport.prototype._messageTemplate = _(
		'build [#<%= build.number %>](<%= baseUrl %>/builds/<%= build.id %>) ' +
		'initiated by <%= build.initiator.type %> is *<%= build.status %>*\n\n' + 
		'<% if (changes.length) { %>' + 
			'scm changes:\n' +
			'<% _(changes).each(function(change, index) { %>' +
				'<%= change.author %>: `<%= change.comment %>`\n' +
			'<% }); %>' +
		'<% } else { %>' +
			'no scm changes\n' +
		'<% } %>' +
		'\n' +
		'<% if (build.status === \'error\') { %>' +
			'failed at *<%= build.currentStep%>*' +
			'```' +
				'<%= build.error.stderr%>' +
			'```' +
		'<% } %>'
	).template();

	Transport.prototype.send = function(params, callback) {
		var self = this,
			build = params.build,
			changes = build.scm && build.scm.changes || [],
			recipients = build.project.notify.to.telegram;

		if (!recipients && !recipients.length) {
			logger.log('no recipients, quit');
			return;
		}

		Steppy(
			function() {
				logger.log('send message to %s', recipients);

				var message = self._messageTemplate({
					build: build,
					baseUrl: app.config.http.url,
					changes: changes
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
