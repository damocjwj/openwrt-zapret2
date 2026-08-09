'use strict';
'require view';
'require form';
'require poll';
'require uci';
'require ui';
'require tools.widgets as widgets';
'require zapret2.v4r10.rpc as api';
'require zapret2.v4r10.strategy as model';
'require zapret2.v4r10.ui as zui';

var map, currentStatus = {}, serviceBusy = false, runtimeLoaded = false, rulesLoaded = false;

function listValue(option) {
	option.cfgvalue = function(section) { return L.toArray(uci.get('zapret2', section, this.option)).filter(Boolean); };
	option.write = function(section, value) { uci.set('zapret2', section, this.option, L.toArray(value).filter(Boolean)); };
}

function validator(check, message) {
	return function(section, value) { return !value || check(value) ? true : message; };
}

function statusValue(title, value) {
	return E('td', { class: 'td', 'data-title': title }, value);
}

function serviceState(status) {
	if (status.running) return [ _('Running'), 'success' ];
	return status.enabled ? [ _('Stopped unexpectedly'), 'warning' ] : [ _('Disabled'), 'notice' ];
}

function renderStatus(status) {
	currentStatus = status || {};
	var node = document.getElementById('zapret2-status-table');
	if (node) {
		var service = serviceState(currentStatus), config = zui.configState(currentStatus.config_state);
		node.replaceChildren(E('table', { class: 'table' }, [
			E('tr', { class: 'tr table-titles' }, [
				E('th', { class: 'th' }, _('Service')), E('th', { class: 'th' }, _('Configuration')),
				E('th', { class: 'th' }, _('PID')), E('th', { class: 'th' }, _('Profiles')),
				E('th', { class: 'th' }, _('TCP out / in')), E('th', { class: 'th' }, _('UDP out / in')),
				E('th', { class: 'th' }, _('Other out / in')), E('th', { class: 'th' }, _('Generated'))
			]),
			E('tr', { class: 'tr' }, [
				statusValue(_('Service'), zui.badge(service[0], service[1])),
				statusValue(_('Configuration'), zui.badge(config[0], config[1])),
				statusValue(_('PID'), currentStatus.pid == null ? '-' : String(currentStatus.pid)),
				statusValue(_('Profiles'), '%d / %d'.format(currentStatus.enabled_profile_count || 0, currentStatus.profile_count || 0)),
				statusValue(_('TCP out / in'), '%d / %d'.format(zui.counter(currentStatus, 'tcp_out'), zui.counter(currentStatus, 'tcp_in'))),
				statusValue(_('UDP out / in'), '%d / %d'.format(zui.counter(currentStatus, 'udp_out'), zui.counter(currentStatus, 'udp_in'))),
				statusValue(_('Other out / in'), '%d / %d'.format(zui.counter(currentStatus, 'other_out'), zui.counter(currentStatus, 'other_in'))),
				statusValue(_('Generated'), String(zui.counter(currentStatus, 'generated')))
			])
		]));
	}
	var start = document.getElementById('zapret2-start'), reload = document.getElementById('zapret2-reload'), stop = document.getElementById('zapret2-stop');
	if (start) start.disabled = serviceBusy || !currentStatus.enabled || currentStatus.running || currentStatus.config_state === 'incompatible';
	if (reload) reload.disabled = serviceBusy || !currentStatus.enabled || currentStatus.config_state === 'incompatible';
	if (stop) stop.disabled = serviceBusy || (!currentStatus.running && !currentStatus.table_present);
	var error = document.getElementById('zapret2-last-error');
	if (error) { error.textContent = currentStatus.last_error || ''; error.hidden = !currentStatus.last_error; }
}

function refreshStatus() { return api.status().then(renderStatus).catch(function() {}); }

function service(action) {
	if (serviceBusy) return Promise.resolve();
	serviceBusy = true; renderStatus(currentStatus);
	return api.service(action).then(renderStatus).catch(zui.notifyError).finally(function() {
		serviceBusy = false;
		return refreshStatus();
	});
}

function validateSaved() {
	return api.validate().then(function(result) {
		zui.notifyWarnings(result.diagnostics);
		zui.notifyInfo(_('The saved configuration is valid.'));
	}).catch(zui.notifyError);
}

function textArea(id, rows) {
	return E('textarea', { id: id, class: 'cbi-input-textarea', readonly: 'readonly', wrap: 'off', rows: rows || 12, style: 'width:100%;font-family:monospace' });
}

function updateRuntime(includeRules) {
	var status = document.getElementById('zapret2-runtime-message');
	if (status) status.textContent = _('Loading applied runtime details…');
	return api.runtime(true, includeRules === true).then(function(data) {
		runtimeLoaded = true;
		if (includeRules) rulesLoaded = true;
		var manifest = document.getElementById('zapret2-runtime-manifest');
		var diagnostics = document.getElementById('zapret2-runtime-diagnostics');
		var argv = document.getElementById('zapret2-runtime-argv');
		var rules = document.getElementById('zapret2-runtime-rules');
		if (manifest) manifest.value = zui.stringify(data.manifest);
		if (diagnostics) diagnostics.value = zui.stringify(data.diagnostics);
		if (argv) argv.value = (data.argv || []).join('\n');
		if (rules && includeRules) rules.value = data.rules || '';
		var rulesPanel = document.getElementById('zapret2-rules-panel');
		if (rulesPanel && includeRules) rulesPanel.hidden = false;
		if (status) status.textContent = _('Applied runtime details were refreshed.');
	}).catch(function(error) {
		if (status) status.textContent = zui.errorText(error);
		zui.notifyError(error);
	});
}

function toggleRuntime() {
	var panel = document.getElementById('zapret2-runtime-panel');
	if (!panel) return Promise.resolve();
	panel.hidden = !panel.hidden;
	if (!panel.hidden && !runtimeLoaded) return updateRuntime(false);
	return Promise.resolve();
}

function renderStatusSection() {
	return E('div', { class: 'cbi-section' }, [
		E('h3', {}, _('Zapret2 status')),
		E('div', { id: 'zapret2-status-table' }),
		E('div', { id: 'zapret2-last-error', class: 'alert-message warning', hidden: '' }),
		E('p', { class: 'cbi-value-description' }, _('Service actions use the last saved configuration. Save pending edits before starting or reloading.')),
		E('div', { class: 'cbi-page-actions' }, [
			E('button', { id: 'zapret2-start', class: 'btn cbi-button-apply', click: ui.createHandlerFn(null, service, 'start') }, _('Start')),
			' ', E('button', { id: 'zapret2-reload', class: 'btn cbi-button-reload', click: ui.createHandlerFn(null, service, 'reload') }, _('Reload')),
			' ', E('button', { id: 'zapret2-stop', class: 'btn cbi-button-remove', click: ui.createHandlerFn(null, service, 'stop') }, _('Stop')),
			' ', E('button', { class: 'btn cbi-button-action', click: ui.createHandlerFn(null, validateSaved) }, _('Validate saved configuration')),
			' ', E('button', { class: 'btn', click: ui.createHandlerFn(null, toggleRuntime) }, _('Show or hide runtime details'))
		]),
		E('div', { id: 'zapret2-runtime-panel', hidden: '' }, [
			E('h4', {}, _('Applied runtime details')),
			E('p', { class: 'cbi-value-description' }, _('These values describe the currently applied process and may differ from saved edits awaiting reload.')),
			E('div', { id: 'zapret2-runtime-message', class: 'cbi-value-description' }),
			E('h5', {}, _('Manifest')), textArea('zapret2-runtime-manifest', 8),
			E('h5', {}, _('Diagnostics')), textArea('zapret2-runtime-diagnostics', 6),
			E('h5', {}, _('Applied argv')), textArea('zapret2-runtime-argv', 12),
			E('div', { class: 'cbi-page-actions' }, [
				E('button', { class: 'btn cbi-button-reload', click: ui.createHandlerFn(null, updateRuntime, false) }, _('Refresh runtime details')),
				' ', E('button', { class: 'btn', click: function() { return zui.copyText(document.getElementById('zapret2-runtime-argv').value); } }, _('Copy argv')),
				' ', E('button', { class: 'btn cbi-button-action', click: ui.createHandlerFn(null, updateRuntime, true) }, _('Load applied nftables rules'))
			]),
			E('div', { id: 'zapret2-rules-panel', hidden: '' }, [E('h5', {}, _('Applied nftables rules')), textArea('zapret2-runtime-rules', 18),
				E('button', { class: 'btn', click: function() { return zui.copyText(document.getElementById('zapret2-runtime-rules').value); } }, _('Copy rules'))])
		])
	]);
}

function addFlag(section, tab, name, title, defaultValue, description) {
	var option = section.taboption(tab, form.Flag, name, title, description);
	option.default = defaultValue; option.rmempty = false; return option;
}
function addNumber(section, tab, name, title, defaultValue, datatype) {
	var option = section.taboption(tab, form.Value, name, title);
	option.default = String(defaultValue); option.datatype = datatype; option.rmempty = false; return option;
}

return view.extend({
	load: function() { return Promise.all([ uci.load('zapret2'), api.info().catch(function(error) { return { error: error }; }), api.status().catch(function() { return {}; }) ]); },
	render: function(data) {
		if (data[1].error)
			return E('div', { class: 'cbi-map' }, [ E('h2', {}, _('Zapret2')), E('div', { class: 'alert-message error' }, zui.errorText(data[1].error)), E('p', {}, _('Configuration is read-only until the core API and schema versions match.')) ]);
		model.setInfo(data[1]); currentStatus = data[2] || {};
		if (uci.get('zapret2', 'main', 'schema_version') !== '2')
			return E('div', { class: 'cbi-map' }, [ E('h2', {}, _('Zapret2')), E('div', { class: 'alert-message error' }, _('This LuCI application requires Zapret2 UCI schema v2. The incompatible configuration is not editable.')) ]);

		map = new form.Map('zapret2', _('Zapret2'), _('OpenWrt traffic interception is configured separately from ordered upstream Zapret2 profiles.'));
		var status = map.section(form.NamedSection, '_status'); status.anonymous = true; status.render = renderStatusSection;
		var s = map.section(form.NamedSection, 'main', 'zapret2', _('Plugin configuration'));
		s.tab('basic', _('Basic settings')); s.tab('intercept', _('Traffic interception')); s.tab('queue', _('Queue settings')); s.tab('advanced', _('Advanced runtime'));
		addFlag(s, 'basic', 'enabled', _('Enable Zapret2'), '0');
		addFlag(s, 'basic', 'ipv4', _('Process IPv4'), '1'); addFlag(s, 'basic', 'ipv6', _('Process IPv6'), '1');
		var o = s.taboption('basic', widgets.NetworkSelect, 'wan_network', _('WAN networks')); o.multiple = true; o.nocreate = true; o.rmempty = false; listValue(o);
		addFlag(s, 'basic', 'process_forwarded', _('Process forwarded traffic'), '1');
		o = s.taboption('basic', widgets.NetworkSelect, 'source_network', _('Forward source networks')); o.multiple = true; o.nocreate = true; o.depends('process_forwarded', '1'); listValue(o);
		addFlag(s, 'basic', 'process_local', _('Process router-local traffic'), '0');

		o = s.taboption('intercept', form.ListValue, 'intercept_mode', _('Interception mode')); o.value('marked', _('Included packet marks only')); o.value('all', _('All eligible traffic')); o.default = 'marked'; o.rmempty = false;
		o = s.taboption('intercept', form.DynamicList, 'include_mark', _('Include packet marks'), _('This selects packets before Profile matching; it is not a domain or IP list.')); o.depends('intercept_mode', 'marked'); o.validate = validator(model.validMatchMark, _('Use 0xVALUE/0xMASK.')); listValue(o);
		o = s.taboption('intercept', form.DynamicList, 'exclude_mark', _('Exclude packet marks'), _('Exclusion always takes precedence.')); o.validate = validator(model.validMatchMark, _('Use 0xVALUE/0xMASK.')); listValue(o);
		addFlag(s, 'intercept', 'all_traffic_ack', _('Acknowledge all-traffic risk'), '0', _('All mode may include proxy or VPN tunnels unless an external mark excludes them.')).depends('intercept_mode', 'all');
		[ [ 'connection_mark', _('Connection tracking mark'), '0x20000000' ], [ 'generated_mark', _('Generated packet mark'), '0x40000000' ] ].forEach(function(item) {
			var q = s.taboption('intercept', form.Value, item[0], item[1]); q.default = item[2]; q.rmempty = false; q.validate = validator(model.validSingleBitMark, _('Use one nonzero hexadecimal bit.'));
		});

		addNumber(s, 'queue', 'queue_num', _('NFQUEUE number'), 200, 'range(1,65535)');
		[ [ 'tcp_out_packets', _('TCP outbound packets'), 20 ], [ 'tcp_in_packets', _('TCP reply packets'), 10 ], [ 'udp_out_packets', _('UDP outbound packets'), 5 ], [ 'udp_in_packets', _('UDP reply packets'), 3 ], [ 'other_out_packets', _('Other protocol outbound packets'), 5 ], [ 'other_in_packets', _('Other protocol reply packets'), 3 ] ].forEach(function(item) { addNumber(s, 'queue', item[0], item[1], item[2], 'range(1,64)'); });

		o = s.taboption('advanced', form.ListValue, 'debug_mode', _('Debug logging')); o.value('off', _('Off')); o.value('syslog', _('System log')); o.default = 'off'; o.rmempty = false;
		addFlag(s, 'advanced', 'bind_fix4', _('IPv4 PBR bind fix'), '0'); addFlag(s, 'advanced', 'bind_fix6', _('IPv6 PBR bind fix'), '0');
		addFlag(s, 'advanced', 'ipcache_hostname', _('Cache hostnames by IP'), '0'); addNumber(s, 'advanced', 'ipcache_lifetime', _('IP cache lifetime (seconds)'), 7200, 'range(0,604800)');
		addFlag(s, 'advanced', 'ctrack_disable', _('Disable nfqws2 conntrack'), '0', _('Autohostlist requires conntrack and will be rejected when this is enabled.'));
		[ [ 'ctrack_syn_timeout', _('SYN timeout'), 60 ], [ 'ctrack_established_timeout', _('Established timeout'), 300 ], [ 'ctrack_fin_timeout', _('FIN timeout'), 60 ], [ 'ctrack_udp_timeout', _('UDP timeout'), 60 ] ].forEach(function(item) { addNumber(s, 'advanced', item[0], item[1], item[2], 'range(1,86400)').depends('ctrack_disable', '0'); });
		addNumber(s, 'advanced', 'lua_gc_interval', _('Lua garbage collection interval'), 300, 'range(0,86400)');
		o = s.taboption('advanced', form.MultiValue, 'payload_disable', _('Disable payload detectors')); model.info().payload.forEach(function(value) { o.value(value, value); }); listValue(o);
		o = s.taboption('advanced', form.MultiValue, 'reasm_disable', _('Disable reassembly')); o.value('tls_client_hello', 'tls_client_hello'); o.value('quic_initial', 'quic_initial'); listValue(o);

		return map.render().then(function(root) { setTimeout(function() { renderStatus(currentStatus); poll.add(refreshStatus, 5); }, 0); return root; });
	},
	handleSave: function() {
		return map.save(function() { return api.validate(model.candidate()).then(function(result) { zui.notifyWarnings(result.diagnostics); }); });
	},
	handleSaveApply: function(event, mode) {
		return this.handleSave().then(function() { return ui.changes.apply(mode === '0'); }).then(function() { return api.service('reload'); }).then(renderStatus).catch(function(error) { zui.notifyError(error); throw error; });
	}
});
