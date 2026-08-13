'use strict';

const fs = require('fs');
const assert = require('assert');
const path = require('path');
const model = require('../htdocs/luci-static/resources/zapret2/v4r33/strategy.js');
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
const rpc = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/zapret2/v4r33/rpc.js'), 'utf8');
assert.strictEqual(menu['admin/services/zapret2'].action.type, 'firstchild');
[ 'config', 'profiles', 'lists', 'log' ].forEach((page) => {
	assert.strictEqual(menu['admin/services/zapret2/' + page].action.path, 'zapret2/v4r33/' + page);
	const view = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r33/' + page + '.js'), 'utf8');
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
assert(!rpc.includes("call('plan'"));
assert(!rpc.includes("call('runtime'"));
assert(rpc.includes("call('list_clear'"));
assert(!rpc.includes('preview_candidate'));
assert(!rpc.includes('reset_defaults'));
assert(!acl['luci-app-zapret2'].read.ubus.zapret2.includes('plan'));
assert(!acl['luci-app-zapret2'].read.ubus.zapret2.includes('runtime'));
assert(acl['luci-app-zapret2'].write.ubus.zapret2.includes('list_clear'));

const config = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r33/config.js'), 'utf8');
const profiles = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r33/profiles.js'), 'utf8');
const lists = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r33/lists.js'), 'utf8');
const logs = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r33/log.js'), 'utf8');
const helpers = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/zapret2/v4r33/ui.js'), 'utf8');
assert(!config.includes('api.runtime'));
assert(!config.includes("_('Configuration')"));
assert(!config.includes('validateSaved'));
assert(!config.includes("_('Runtime details')"));
assert(!config.includes('zapret2-runtime-panel'));
assert(!config.includes('Applied manifest'));
assert(config.includes("api.validate(model.candidate())"));
assert(config.includes("api.service('reload')"));
assert(config.includes('other_out_packets'));
assert(config.includes('ctrack_disable'));
assert(config.includes("new form.Map('zapret2', _('Zapret2')"));
assert(config.includes('function serviceActions()'));
assert(config.includes("class: 'table cbi-section-table'"));
assert(config.includes("class: 'td middle'"));
assert(config.includes("class: 'td center nowrap cbi-section-actions middle'"));
assert(config.includes("E('tr', { class: 'tr cbi-section-table-row' }, ["));
assert(!config.includes("E('tr', { class: 'tr cbi-rowstyle-2' }, ["));
assert(!config.includes("style: 'width:1%;white-space:nowrap'"));
assert(config.includes('zui.tableActions(['));
assert(config.includes("serviceActions())"));
assert(config.includes("_('All mode may include proxy or VPN tunnels unless an external mark excludes them.')"));
assert(config.includes("form.ListValue, 'intercept_mode', _('Interception mode'), _('All mode may include proxy or VPN tunnels unless an external mark excludes them.')"));
assert(!config.includes('syncAllTrafficWarning'));
assert(!config.includes('data-zapret2-all-traffic-warning'));
assert(!config.includes('_all_traffic_warning'));
assert(!config.includes("'all_traffic_ack'"));
assert(!config.includes("_('Acknowledge all-traffic risk')"));
assert(!config.includes('Service actions use the saved settings'));
assert(!config.includes("var s = map.section(form.NamedSection, 'main', 'zapret2', _('Settings'))"));
assert(config.includes("zui.alertMessage('', 'error'"));
assert(config.includes("zui.alertMessage('', 'warning', { id: 'zapret2-status-error'"));
assert(config.includes("if (!status) return [ _('Unknown'), 'notice' ]"));
assert(config.includes("Unable to update service status"));
assert(config.includes('if (!currentStatus) renderStatus(null)'));
assert(profiles.includes('api.validate(model.candidate())'));
assert(profiles.includes("_('Validate changes')"));
assert(!profiles.includes('api.plan(model.candidate()'));
assert(!profiles.includes("_('Candidate configuration plan')"));
assert(!profiles.includes("E('details'"));
assert(!profiles.includes("E('summary'"));
assert(profiles.includes('cbi_update_table(content, rows)'));
assert(profiles.includes("E('h3', {}, profile.name || id),\n\t\tzui.sectionDescription(STEP_ORDER_DESCRIPTION)"));
assert(!profiles.slice(profiles.indexOf('function renderProfileSteps'), profiles.indexOf('function selectProfile')).includes('zui.sectionDescription(STEP_ORDER_DESCRIPTION)'));
assert(profiles.includes("class: 'th center nowrap cbi-section-actions', style: 'min-width:max-content'"));
assert(profiles.includes('zui.fitActionColumn(content)'));
assert(!profiles.includes("cell.style.textAlign = 'center'"));
assert(profiles.includes('zui.tableActions(['));
assert(profiles.includes('addStepDialog, profile'));
assert(/map\s*\.parse\(\)\s*\.then\(function\s*\(\)\s*\{\s*return profileGrid\.renderMoreOptionsModal\(id\);\s*\}\)/s.test(profiles));
assert(profiles.includes("q.value('', _('No local lists available'))"));
assert(profiles.includes('q.readonly = true'));
assert(profiles.includes('STEP_PARAMETER_COLUMNS'));
assert(profiles.includes('fields.columns()'));
assert(profiles.includes('fields.label(name)'));
assert(profiles.includes('stepContextSummary(step)'));
assert(profiles.includes("cell.style.position = 'sticky'"));
assert(profiles.includes("if (cell.tagName !== 'TH') cell.style.backgroundColor = 'inherit'"));
assert(helpers.includes("cell.style.whiteSpace = 'nowrap'"));
assert(!profiles.includes("var(--bg-light, Canvas)"));
assert(profiles.includes("disabled: steps[0] === step ? true : null"));
assert(profiles.includes("disabled: steps[steps.length - 1] === step ? true : null"));
assert(profiles.includes("disabled: index === 0 ? true : null"));
assert(profiles.includes("disabled: index === profiles.length - 1 ? true : null"));
assert(!profiles.includes("disabled: steps[0] === step,"));
assert(!profiles.includes("disabled: index === 0,"));
assert(profiles.includes('activeProfileId = null'));
assert(profiles.includes('function selectProfile(id)'));
assert(profiles.includes('activeProfileId = id'));
assert(profiles.includes("profile['.name'] === activeProfileId"));
assert(/function selectProfile\(id\) \{\s*activeProfileId = id;\s*return rerender\(\);\s*\}/s.test(profiles));
assert(!profiles.includes('ensureActive'));
assert(profiles.includes('model.supports(type, option)'));
assert(profiles.includes('autohostlist'));
assert(profiles.includes("label(step.type)"));
assert(profiles.includes('function renderProfileOverview(profiles)'));
assert(profiles.includes('function renderProfileWorkspace(profile)'));
assert(profiles.includes('function pipelineOverview(profile)'));
assert(profiles.includes("function overviewLines(primary, secondary)"));
assert(profiles.includes("E('th', { class: 'th left top' }, _('Profile'))"));
assert(profiles.includes("E('th', { class: 'th left top' }, _('Traffic match'))"));
assert(profiles.includes("E('th', { class: 'th left top' }, _('Filters and steps'))"));
assert(profiles.includes("overviewLines(profile.name || id, id)"));
assert(profiles.includes("E('div', { class: 'left' }, profileTraffic(profile))"));
assert(!profiles.includes("E('strong', {}, profile.name || id)"));
assert(profiles.includes("E('h3', {}, profile.name || id)"));
assert(!profiles.includes("E('h3', {}, [profile.name || id, ' ', profileState(profile)])"));
assert(profiles.includes("values.slice(0, 3).join(' → ')") && profiles.includes("values.length > 3 ? ' …' : ''"));
assert(profiles.includes("_('Profile order')"));
assert(profiles.includes("_('Profile workspace')"));
assert(!profiles.includes("_('Selected')"));
assert(!profiles.includes("_('Viewing')"));
assert(profiles.includes("zui.pageHeader(_('Profiles')"));
assert(!profiles.includes("class: 'alert-message notice'"));
assert(profiles.includes("new form.Map(\n\t\t\t'zapret2',\n\t\t\t_('Profiles'),"));
assert(!profiles.includes("zui.pageHeader(_('Profiles'), _('Packets use the first enabled matching Profile"));
assert(!profiles.includes('scrollableStepTable'));
assert.strictEqual((profiles.match(/overflow-x:auto/g) || []).length, 1);
assert(profiles.indexOf("_('Add step')") > profiles.indexOf("overflow-x:auto"));
assert.strictEqual((profiles.match(/Payload and range conditions apply only to actions that follow them in this Profile\./g) || []).length, 1);
assert(!profiles.includes("E('tr', {}, ["));
assert(!profiles.includes('cloneSection'));
assert(profiles.includes('function toggleProfile(sectionId, enabled)'));
assert(profiles.includes("uci.set('zapret2', sectionId, 'enabled', enabled ? '1' : '0')"));
assert(profiles.includes('function profileToggleButton(profile)'));
assert(profiles.includes('function profileOverviewActions(profile, index, profiles, selected)'));
assert(profiles.includes("disabled: selected ? true : null"));
assert(profiles.includes("click: ui.createHandlerFn(null, editProfile, profile['.name'])"));
assert(profiles.includes("click: ui.createHandlerFn(null, move, profile['.name'], 'profile', -1)"));
assert(profiles.includes("click: ui.createHandlerFn(null, move, profile['.name'], 'profile', 1)"));
assert(profiles.includes("click: ui.createHandlerFn(null, removeProfile, profile['.name'])"));
const stepTable = profiles.slice(
	profiles.indexOf('function renderProfileSteps(profile, steps)'),
	profiles.indexOf('function selectProfile(id)'),
);
assert(stepTable.includes('zui.fitActionColumn(content)'));
assert(!stepTable.includes("cell.style.textAlign = 'center'"));
assert(stepTable.includes("querySelectorAll('th.cbi-section-actions, td.cbi-section-actions')"));
assert(!stepTable.includes("querySelectorAll('.cbi-section-actions')"));
assert(profiles.includes("style: 'width:1%;white-space:nowrap'"));
assert(!profiles.includes('function pipeline(profile)'));
const workspace = profiles.slice(
	profiles.indexOf('function renderProfileWorkspace(profile)'),
	profiles.indexOf('function renderCards()'),
);
assert(!workspace.includes("_('Ordered processing steps')"));
assert(!workspace.includes('Profile ID: %s'));
assert(!workspace.includes('Traffic match:'));
assert(!workspace.includes('Domain/IP filters:'));
assert(!workspace.includes('Processing steps:'));
assert(!workspace.includes('profileToggleButton(profile)'));
assert(!workspace.includes('editProfile'));
assert(profiles.includes("enabled ? _('Disable') : _('Enable')"));
assert(profiles.includes("enabled ? _('Disable this Profile') : _('Enable this Profile')"));
assert(profiles.includes("class: 'btn cbi-button-neutral enable-disable'"));
assert(!profiles.includes("role: 'switch'"));
assert(!profiles.includes("class: 'cbi-input-checkbox'"));
assert(profiles.includes('function addProfileDialog()'));
assert(profiles.includes("_('Empty Profile (disabled)')"));
assert(profiles.includes("_('HTTP conservative (enabled)')"));
assert(profiles.includes("_('TLS conservative (enabled)')"));
assert(profiles.includes("_('QUIC standard (disabled)')"));
assert(!profiles.includes("_('Add empty Profile')"));
assert(profiles.includes("sections('profile').length >= +(model.info().limits.profiles || 8)"));
assert(profiles.includes("_('No Profiles are configured.')"));
assert(/\.then\(function \(result\) \{\s*invalidateCandidateStatus\(\);\s*return rerender/s.test(profiles));
assert(profiles.includes('stepGrid.map.addedSection = id'));
assert(profiles.includes("uci.remove('zapret2', id)"));
assert(profiles.includes('var inheritedStepCancel = stepGrid.handleModalCancel'));
assert(lists.includes('disabled: referenced'));
assert(lists.includes("zui.pageHeader(_('Local lists')"));
assert(lists.includes("class: 'th center nowrap cbi-section-actions top'"));
assert(lists.includes('zui.tableActions(actions)'));
assert(/actions\.push\(E\('button'.+_\('Edit'\).+actions\.push\(E\('button'.+_\('Export'\).+actions\.push\(E\('button'.+_\('Delete'\)/s.test(lists));
assert(rpc.includes("versionError.code = 'incompatible_api'"));
assert(logs.includes('poll.add(function()'));
assert(logs.includes('new form.JSONMap'));
assert(logs.includes("section.option(form.TextValue, 'text')"));
assert(logs.includes('text.readonly = true'));
assert(logs.includes('text.monospace = true'));
assert(logs.includes('api.log(100)'));
assert(logs.includes("refresh.inputstyle = 'reload'"));
assert(logs.includes("_('Scroll to bottom')"));
assert(logs.includes('}, 3)'));
assert(logs.includes('Last refresh failed'));
assert(logs.includes("zui.alertMessage('', 'warning'"));
assert(logs.includes("new form.JSONMap(model, _('Log')"));
assert(logs.includes("_('Recent log')"));
assert(logs.includes('node.scrollTop = node.scrollHeight'));
assert(!logs.includes('filteredLog'));
assert(!logs.includes("_('Pause')"));
assert(!logs.includes("_('Invert filter')"));
assert(!logs.includes("_('Copy log')"));
assert(config.includes("[ _('Running'), 'success' ]"));
assert(config.includes("[ _('Stopped unexpectedly'), 'danger' ]"));
assert(config.includes("[ _('Disabled'), 'notice' ]"));
assert(helpers.includes('function actionRow(buttons, className, attributes)'));
assert(helpers.includes("return actionRow(buttons, 'button-row')"));
assert(helpers.includes('function tableActions(buttons)'));
assert(helpers.includes("return actionRow(buttons, 'nowrap')"));
assert(helpers.includes('function fitActionColumn(table)'));
assert(helpers.includes("cell.style.width = '1%'"));
assert(helpers.includes("cell.style.minWidth = 'max-content'"));
assert(config.includes('zui.fitActionColumn(table)'));
assert(profiles.includes('zui.fitActionColumn(table)'));
assert(lists.includes('zui.fitActionColumn(node)'));
assert(!helpers.includes('gap:') && !helpers.includes('inline-flex') && !helpers.includes('justify-content'));
assert(helpers.includes('function pageHeader(title, description)'));
assert(helpers.includes('function sectionDescription(text)'));
assert(helpers.includes('function alertMessage(text, kind, attributes)'));
assert(!helpers.includes('function configState'));
assert(!helpers.includes('function copyText'));
assert(!helpers.includes("E('div', { class: 'right' }"));
assert(!helpers.includes("kind === 'danger' ? ' cbi-button-negative' : ''"));
assert(!helpers.includes('function notifyInfo'));
assert(profiles.includes("warnings.length ? 'warning' : 'success'"));
assert(profiles.includes("_('Not validated')"));
assert(profiles.includes("_('Validating')"));
assert(profiles.includes("_('Valid with warnings')"));
assert(profiles.includes("_('Valid')"));
assert(profiles.includes("_('Invalid')"));
assert(profiles.includes("class: 'table cbi-section-table'"));
assert(profiles.includes("class: 'tr cbi-section-table-row'"));
assert(profiles.includes("id: 'zapret2-validation-state'"));
assert(profiles.includes("id: 'zapret2-validation-result'"));
assert(profiles.includes("id: 'zapret2-validation-button'"));
assert(profiles.includes("id: 'zapret2-validation-detail'"));
assert(profiles.includes("id: 'zapret2-validation-state', class: 'td middle', style: 'width:1%;white-space:nowrap'"));
assert(profiles.includes("id: 'zapret2-validation-detail', hidden: candidateStatus.detail ? null : '', style: 'white-space:pre-wrap'"));
assert(profiles.includes("candidateStatus.busy ? ' spinning' : ''"));
assert(profiles.includes('button.disabled = candidateStatus.busy'));
assert(profiles.includes("setValidationSuccess(lastValidationResult, 'saved')"));
assert(profiles.includes("setValidationSuccess(lastValidationResult, 'applied')"));
assert(profiles.includes('if (candidateStatus.busy) setValidationError(error)'));
assert(profiles.includes('candidateRevision = 0'));
assert(profiles.includes('var revision = candidateRevision'));
assert(profiles.includes('if (revision !== candidateRevision) return result'));
assert(profiles.includes('candidateRevision++'));
assert(!profiles.includes('zapret2-candidate-status'));
assert(!profiles.includes('Save validates the changes before writing. Save & Apply also reloads the service.'));
assert(profiles.includes("enabled ? 'success' : 'notice'"));
assert(!config.includes("class: 'alert-message warning', hidden"));
[ config, profiles, lists ].forEach((source) => {
	assert(!source.includes("E('div', { class: 'cbi-page-actions' }"), 'raw page action group found');
	assert(!source.includes("E('div', { class: 'right' }"), 'raw modal action group found');
});
[ config, profiles, lists, logs, helpers ].forEach((source) => {
	assert(!/#[0-9a-f]{3,8}\b/i.test(source), 'custom color literal found');
	assert(!/style\s*:[^\n]*(?:color|background)/i.test(source), 'custom color style found');
});

/* Evaluate each LuCI view factory with inert dependencies. This catches the
 * invalid-constructor regressions caused by returning a helper module instead
 * of a view.extend() instance, without duplicating browser-side rendering. */
global._ = (value) => value;
for (const page of [ 'config', 'profiles', 'lists', 'log' ]) {
	const source = fs.readFileSync(path.join(root, 'htdocs/luci-static/resources/view/zapret2/v4r33/' + page + '.js'), 'utf8');
	const aliases = [];
	for (const match of source.matchAll(/'require ([^']+)';/g)) {
		const directive = match[1].split(/\s+as\s+/);
		aliases.push(directive[1] || directive[0].split('.').pop());
	}
	const mocks = aliases.map((name) => {
		if (name === 'view') return { extend: (value) => value };
		if (name === 'fields') return { columns: () => [], label: (value) => value };
		return {};
	});
	const exported = Function(...aliases, source)(...mocks);
	assert(exported && typeof exported.render === 'function', page + ' did not yield a LuCI view constructor');
}
delete global._;

console.log('luci-app-zapret2 API v1/schema v2 UI checks passed');
