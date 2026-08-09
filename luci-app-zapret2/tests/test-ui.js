'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');
const model = require('../htdocs/luci-static/resources/zapret2/v4r10/strategy.js');
const root = path.resolve(__dirname, '..');

model.setInfo({
	limits: { profiles: 8, profile_steps: 32, steps: 128 },
	l7: [ 'http', 'tls', 'quic' ], payload: [ 'http_req', 'tls_client_hello', 'quic_initial' ],
	conditions: [ 'payload', 'out_range', 'in_range' ], actions: [ 'drop', 'send', 'fake', 'multisplit' ],
	action_parameters: { drop: [ 'direction' ], send: [ 'direction', 'delay', 'repeats' ], fake: [ 'direction', 'blob', 'repeats' ], multisplit: [ 'direction', 'position' ] },
	list_limits: { count: 32, file_bytes: 1048576, total_bytes: 8388608 }
});

assert(model.validId('tls_default'));
assert(!model.validId('../tls'));
assert(model.validMatchMark('0x10000000/0x10000000'));
assert(!model.validMatchMark('0x3/0x2'));
assert(model.validSingleBitMark('0x40000000'));
assert(!model.validSingleBitMark('0x3'));
assert(model.validPort('443'));
assert(model.validPort('1000-2000'));
assert(model.validPort('*'));
assert(model.validPort('~443'));
assert(model.validPort('~*'));
assert(!model.validPort('2000-1000'));
assert(model.validIcmp('*'));
assert(model.validIcmp('8:0'));
assert(!model.validIcmp('256'));
assert(model.validProtocol('255'));
assert(!model.validProtocol('256'));
assert(model.validDomain('example.com'));
assert(model.validDomain('^api.example.com'));
assert(!model.validDomain('https://example.com'));
assert(model.validIp('192.0.2.0/24'));
assert(model.validIp('2001:db8::/32'));
assert(model.validAutottl('-1,3-20'));
assert(model.validFragPos('32'));
assert(model.validRange('b0-b4096'));
assert(model.validPosition('1,midsld+1,-10'));
assert(model.supports('send', 'delay'));
assert(!model.supports('drop', 'delay'));
assert.deepStrictEqual(model.stepTypes(), [ 'payload', 'out_range', 'in_range', 'drop', 'send', 'fake', 'multisplit' ]);

const candidate = model.candidateFromSections([
	{ '.name': 'main', '.type': 'zapret2', schema_version: '2', enabled: '0', wan_network: [ 'wan' ] },
	{ '.name': 'tls', '.type': 'profile', id: 'tls', enabled: '1', tcp_port: [ '443' ] }
]);
assert.strictEqual(candidate.api_version, 1);
assert.strictEqual(candidate.schema_version, 2);
assert.deepStrictEqual(candidate.sections[0].options, { schema_version: '2', enabled: '0' });
assert.deepStrictEqual(candidate.sections[0].lists, { wan_network: [ 'wan' ] });
assert.strictEqual(candidate.sections[1].type, 'profile');

const menu = JSON.parse(fs.readFileSync(path.join(root, 'root/usr/share/luci/menu.d/luci-app-zapret2.json'), 'utf8'));
const acl = JSON.parse(fs.readFileSync(path.join(root, 'root/usr/share/rpcd/acl.d/luci-app-zapret2.json'), 'utf8'));
const rpc = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/zapret2/v4r10/rpc.js'), 'utf8');
assert.strictEqual(menu['admin/services/zapret2'].action.type, 'firstchild');
[ 'config', 'profiles', 'lists', 'log' ].forEach((page) => {
	assert.strictEqual(menu['admin/services/zapret2/' + page].action.path, 'zapret2/v4r10/' + page);
	const view = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r10/' + page + '.js'), 'utf8');
	assert(view.includes('return view.extend({'));
});
assert(!menu['admin/services/zapret2/runtime']);
assert(!fs.existsSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/runtime.js')));
assert(!fs.existsSync(path.join(root, 'htdocs/luci-static/resources/zapret2/rpc.js')));
assert(!fs.existsSync(path.join(root, 'htdocs/luci-static/resources/zapret2/strategy.js')));
assert(!fs.existsSync(path.join(root, 'root/usr/share/rpcd/ucode/zapret2.uc')));
assert(rpc.includes("object: 'zapret2'"));
assert(!rpc.includes("object: 'luci.zapret2'"));
assert(rpc.includes("call('info')"));
assert(rpc.includes("call('plan'"));
assert(rpc.includes("call('runtime'"));
assert(rpc.includes("call('list_clear'"));
assert(!rpc.includes('preview_candidate'));
assert(!rpc.includes('reset_defaults'));
assert(acl['luci-app-zapret2'].read.ubus.zapret2.includes('plan'));
assert(acl['luci-app-zapret2'].write.ubus.zapret2.includes('list_clear'));

const config = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r10/config.js'), 'utf8');
const profiles = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r10/profiles.js'), 'utf8');
const lists = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r10/lists.js'), 'utf8');
const logs = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r10/log.js'), 'utf8');
assert(config.includes("api.runtime(true, includeRules === true)"));
assert(config.includes("api.service('reload')"));
assert(config.includes('other_out_packets'));
assert(config.includes('ctrack_disable'));
assert(profiles.includes('api.validate(model.candidate())'));
assert(profiles.includes("_('Validate current changes')"));
assert(!profiles.includes('api.plan(model.candidate()'));
assert(!profiles.includes("_('Candidate configuration plan')"));
assert(!profiles.includes("E('details'"));
assert(!profiles.includes("E('summary'"));
assert(profiles.includes('cbi_update_table(content, rows)'));
assert(profiles.includes("_('Expand steps (%d)')"));
assert(profiles.includes("_('Collapse steps (%d)')"));
assert(profiles.includes("'aria-controls': stepPanelId(id)"));
assert(profiles.includes("button.setAttribute('aria-expanded'"));
assert(profiles.includes('panel.hidden = !expanded'));
assert(profiles.includes("panel.style.display = expanded ? '' : 'none'"));
assert(profiles.includes('expandedProfiles[id] = true'));
assert(profiles.includes('addStepDialog, profile'));
assert(/map\s*\.parse\(\)\s*\.then\(function\s*\(\)\s*\{\s*return profileGrid\.renderMoreOptionsModal\(id\);\s*\}\)/s.test(profiles));
assert(profiles.includes("q.value('', _('No local lists available'))"));
assert(profiles.includes('q.readonly = true'));
assert(profiles.includes('STEP_PARAMETER_COLUMNS'));
assert(/\[\s*'ipfrag_pos_tcp',\s*'TCP fragment position'\s*\]/.test(profiles));
assert(profiles.includes('stepContextSummary(step)'));
assert(profiles.includes("cell.style.position = 'sticky'"));
assert(profiles.includes("if (cell.tagName !== 'TH') cell.style.backgroundColor = 'inherit'"));
assert(!profiles.includes("var(--bg-light, Canvas)"));
assert(profiles.includes("disabled: steps[0] === step ? true : null"));
assert(profiles.includes("disabled: steps[steps.length - 1] === step ? true : null"));
assert(profiles.includes("disabled: index === 0 ? true : null"));
assert(profiles.includes("disabled: index === profiles.length - 1 ? true : null"));
assert(!profiles.includes("disabled: steps[0] === step,"));
assert(!profiles.includes("disabled: index === 0,"));
assert(!profiles.includes('activeProfile'));
assert(!profiles.includes('ensureActive'));
assert(profiles.includes('model.supports(type, option)'));
assert(profiles.includes('autohostlist'));
assert(profiles.includes("label(step.type)"));
assert(/var cards = profiles\.length\s*\?\s*E\(\s*\[\],\s*profiles\.map/s.test(profiles));
assert(!profiles.includes('scrollableStepTable'));
assert(!profiles.includes("E('tr', {}, ["));
assert(!profiles.includes('cloneSection'));
assert(lists.includes('disabled: referenced'));
assert(rpc.includes("versionError.code = 'incompatible_api'"));
assert(logs.includes('poll.add(function()'));
assert(logs.includes("id: 'content_syslog'"));
assert(logs.includes("_('severity:')"));
assert(!logs.includes('facility'));
assert(logs.includes('Pause automatic refresh'));
assert(logs.includes('Last refresh failed'));
assert(logs.includes('node.scrollHeight - node.scrollTop'));

/* Evaluate each LuCI view factory with inert dependencies. This catches the
 * invalid-constructor regressions caused by returning a helper module instead
 * of a view.extend() instance, without duplicating browser-side rendering. */
global._ = (value) => value;
for (const page of [ 'config', 'profiles', 'lists', 'log' ]) {
	const source = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r10/' + page + '.js'), 'utf8');
	const aliases = [];
	for (const match of source.matchAll(/'require ([^']+)';/g)) {
		const directive = match[1].split(/\s+as\s+/);
		aliases.push(directive[1] || directive[0].split('.').pop());
	}
	const mocks = aliases.map((name) => name === 'view' ? { extend: (value) => value } : {});
	const exported = Function(...aliases, source)(...mocks);
	assert(exported && typeof exported.render === 'function', page + ' did not yield a LuCI view constructor');
}
delete global._;

console.log('luci-app-zapret2 API v1/schema v2 UI checks passed');
