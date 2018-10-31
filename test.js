'use strict';

var Steppy = require('twostep').Steppy,
	expect = require('expect.js'),
	_ = require('underscore'),
	nock = require('nock'),
	plugin = require('./lib');

var createSendParams = function(params) {
	return {
		build: _({
			id: 25,
			number: 10,
			status: 'done',
			initiator: {type: 'user'},
			scm: {changes: []},
			project: {
				name: 'nci',
				notify: {to: {telegram: [123]}},
				scm: {
					rev: 'default'
				}
			}
		}).extend(params)
	};
};

describe('Telegram notifier', function() {
	var notifier,
		bodies = [],
		token = 'deadbeef';

	before(function() {
		plugin.register({
			lib: {
				logger: function() {
					return {log: _.noop, error: _.noop};
				},
				notifier: {
					register: function(type, constructor) {
						notifier = new constructor();
						notifier.init({token: token}, _.noop);
					},
					BaseNotifierTransport: function() {
					}
				}
			},
			config: {http: {url: 'http://127.0.0.1:3000'}}
		});

		nock('https://api.telegram.org')
			.persist()
			.post('/bot' + token + '/sendMessage')
			.reply(function(uri, body) {
				bodies.push(body);
				return [200, 'ok!'];
			});
	});

	afterEach(function() {
		bodies = [];
	});

	it('empty recipients', function(done) {
		Steppy(
			function() {
				notifier.send(createSendParams({
					project: {notify: {to: {telegram: []}}}
				}), this.slot());
			},
			function() {
				expect(bodies).to.have.length(0);
				this.pass(null);
			},
			done
		);
	});

	it('one recipient', function(done) {
		Steppy(
			function() {
				notifier.send(createSendParams({
					project: {
						notify: {to: {telegram: [123]}},
						scm: {rev: 'default'}
					}
				}), this.slot());
			},
			function() {
				expect(bodies).to.have.length(1);
				expect(bodies[0].chat_id).to.eql(123);
				expect(bodies[0].text.length).to.be.above(0);
				this.pass(null);
			},
			done
		);
	});

	it('two recipients', function(done) {
		Steppy(
			function() {
				notifier.send(createSendParams({
					project: {
						notify: {to: {telegram: [123, 456]}},
						scm: {rev: 'default'}
					}
				}), this.slot());
			},
			function() {
				expect(bodies).to.have.length(2);
				bodies = _(bodies).sortBy('chat_id');
				expect(bodies[0].chat_id).to.eql(123);
				expect(bodies[1].chat_id).to.eql(456);
				expect(bodies[0].text.length).to.be.above(0);
				expect(bodies[1].text.length).to.be.above(0);
				this.pass(null);
			},
			done
		);
	});

	it('custom revision', function(done) {
		Steppy(
			function() {
				notifier.send(createSendParams({
					project: {
						notify: {to: {telegram: [123]}},
						scm: {rev: 'release'}
					}
				}), this.slot());
			},
			function() {
				expect(bodies).to.have.length(1);
				expect(bodies[0].text.length).to.be.above(0);
				expect(bodies[0].text).to.be.contain('scm target is release')

				this.pass(null);
			},
			done
		);
	});

	it('empty scm', function(done) {
		Steppy(
			function() {
				notifier.send(createSendParams({
					scm: null,
					project: {
						notify: {to: {telegram: [123]}},
						scm: {rev: 'release'}
					}
				}), this.slot());
			},
			function() {
				expect(bodies).to.have.length(1);
				expect(bodies[0].text.length).to.be.above(0);
				expect(bodies[0].text).to.be.contain('scm target is release')

				this.pass(null);
			},
			done
		);
	});
});