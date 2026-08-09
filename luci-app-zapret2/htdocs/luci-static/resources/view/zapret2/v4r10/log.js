'use strict';
'require view';
'require poll';
'require zapret2.v4r10.rpc as api';
'require zapret2.v4r10.ui as zui';

var rawLog = '', filterText = '', invertText = false, severity = 'any', invertSeverity = false, paused = false;
var severities = [
	[ 'any', '', _('Any') ], [ '0', 'emerg', _('Emergency') ], [ '1', 'alert', _('Alert') ],
	[ '2', 'crit', _('Critical') ], [ '3', 'err', _('Error') ], [ '4', 'warn', _('Warning') ],
	[ '5', 'notice', _('Notice') ], [ '6', 'info', _('Info') ], [ '7', 'debug', _('Debug') ]
];

function output() { return document.getElementById('syslog'); }
function filteredLog() {
	return rawLog.split('\n').filter(function(line) {
		if (!line && !rawLog) return false;
		var severityMatch = severity === 'any' || line.indexOf('.' + severity) >= 0;
		var textMatch = !filterText || line.toLowerCase().indexOf(filterText.toLowerCase()) >= 0;
		return (invertSeverity ? !severityMatch : severityMatch) && (invertText ? !textMatch : textMatch);
	}).join('\n');
}
function updateStatus(error) {
	var node = document.getElementById('zapret2-log-status');
	if (node) node.textContent = error ? _('Last refresh failed: %s').format(zui.errorText(error)) :
		(paused ? _('Automatic refresh is paused.') : _('Last updated: %s · refresh interval: %s seconds').format(new Date().toLocaleTimeString(), L.env.pollinterval));
	if (node) node.className = error ? 'alert-message warning' : 'cbi-value-description';
}
function updateLog() {
	var node = output(); if (!node) return;
	var tail = node.scrollHeight - node.scrollTop - node.clientHeight < 8, position = node.scrollTop, value = filteredLog();
	node.value = value; node.rows = Math.max(1, value ? value.split('\n').length + 1 : 1);
	if (tail) node.scrollTop = node.scrollHeight; else node.scrollTop = position;
}
function refreshLog() {
	return api.log(100).then(function(data) {
		rawLog = data.text || ''; updateLog(); updateStatus(null);
	}).catch(function(error) { updateStatus(error); throw error; });
}
function setPaused(button) {
	paused = !paused;
	button.textContent = paused ? _('Resume automatic refresh') : _('Pause automatic refresh');
	updateStatus(null);
	if (!paused) return refreshLog().catch(function() {});
}
function scrollToTail() { var node = output(); if (node) node.scrollTop = node.scrollHeight; }
function scrollToHead() { var node = output(); if (node) node.scrollTop = 0; }

return view.extend({
	load: function() { return api.log(100).catch(function(error) { return { text: '', error: error }; }); },
	render: function(data) {
		rawLog = data.text || ''; paused = false;
		var invertSeverityInput = E('input', { type: 'checkbox', class: 'cbi-input-checkbox' });
		var severitySelect = E('select', { class: 'cbi-input-select', style: 'margin-bottom:10px' }, severities.map(function(item) { return E('option', { value: item[1] }, item[2]); }));
		var invertTextInput = E('input', { type: 'checkbox', class: 'cbi-input-checkbox' });
		var textInput = E('input', { class: 'cbi-input-text' });
		var pauseButton = E('button', { class: 'cbi-button cbi-button-neutral' }, _('Pause automatic refresh'));
		var refreshButton = E('button', { class: 'cbi-button cbi-button-neutral' }, _('Refresh now'));
		var copyButton = E('button', { class: 'cbi-button cbi-button-neutral' }, _('Copy log'));

		function changeFilter() {
			severity = severitySelect.value || 'any'; invertSeverity = invertSeverityInput.checked;
			filterText = textInput.value || ''; invertText = invertTextInput.checked; updateLog();
		}
		severitySelect.addEventListener('change', changeFilter); invertSeverityInput.addEventListener('change', changeFilter);
		textInput.addEventListener('input', changeFilter); invertTextInput.addEventListener('change', changeFilter);
		pauseButton.addEventListener('click', function() { return setPaused(pauseButton); });
		refreshButton.addEventListener('click', function() { return refreshLog().catch(zui.notifyError); });
		copyButton.addEventListener('click', function() { return zui.copyText(filteredLog()); });

		var tailButton = E('button', { class: 'cbi-button cbi-button-neutral', click: scrollToTail }, _('Scroll to tail'));
		var headButton = E('button', { class: 'cbi-button cbi-button-neutral', click: scrollToHead }, _('Scroll to head'));
		var root = E([], [
			E('h2', {}, _('Zapret2')),
			E('div', { id: 'content_syslog' }, [
				E('div', { style: 'margin-bottom:10px' }, [
					E('label', { style: 'margin-right:5px' }, _('Not')), invertSeverityInput,
					E('label', { style: 'margin:0 5px' }, _('severity:')), severitySelect
				]),
				E('div', { style: 'margin-bottom:10px' }, [
					E('label', { style: 'margin-right:5px' }, _('Not')), invertTextInput,
					E('label', { style: 'margin:0 5px' }, _('including:')), textInput
				]),
				E('div', { style: 'padding-bottom:20px' }, [ tailButton, ' ', pauseButton, ' ', refreshButton, ' ', copyButton ]),
				E('textarea', { id: 'syslog', style: 'font-size:12px', readonly: 'readonly', wrap: 'off', rows: Math.max(1, rawLog ? rawLog.split('\n').length + 1 : 1) }, rawLog),
				E('div', { style: 'padding:20px 0' }, [ headButton ]),
				E('div', { id: 'zapret2-log-status', class: 'cbi-value-description' })
			])
		]);
		setTimeout(function() {
			updateLog(); updateStatus(data.error);
			poll.add(function() { return paused ? Promise.resolve() : refreshLog().catch(function() {}); });
		}, 0);
		return root;
	},
	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
