'use strict';
'require baseclass';
'require ui';

/* Versioned browser helpers for luci-app-zapret2 4.0.0-r10. */

function errorText(error) {
	if (!error) return _('Unknown error');
	var location = [];
	if (error.section) location.push(_('section %s').format(error.section));
	if (error.option) location.push(_('option %s').format(error.option));
	if (error.step) location.push(_('step %s').format(error.step));
	if (error.line) location.push(_('line %d').format(error.line));
	return (error.message || String(error)) + (location.length ? '\n(' + location.join(', ') + ')' : '');
}

function notifyError(error) {
	ui.addNotification(null, E('p', { style: 'white-space:pre-wrap' }, errorText(error)), 'error');
	if (error && error.section) setTimeout(function() {
		var suffix = error.option ? '.' + error.option : '';
		var node = document.getElementById('widget.cbid.zapret2.' + error.section + suffix) ||
			document.getElementById('cbid.zapret2.' + error.section + suffix);
		if (!node) return;
		var control = node.matches && node.matches('input,select,textarea,button') ? node : node.querySelector && node.querySelector('input,select,textarea,button');
		(control || node).scrollIntoView({ block: 'center', behavior: 'smooth' });
		if (control && control.focus) control.focus();
	}, 0);
}

function notifyWarnings(diagnostics) {
	var messages = ((diagnostics && diagnostics.warnings) || []).map(function(item) { return item.message || String(item); });
	if (messages.length)
		ui.addNotification(null, E('p', { style: 'white-space:pre-wrap' }, messages.join('\n')), 'warning');
}

function notifyInfo(message) {
	ui.addNotification(null, E('p', { style: 'white-space:pre-wrap' }, message), 'info');
}

function copyText(text) {
	text = String(text || '');
	if (!text) return Promise.resolve();
	if (navigator.clipboard && navigator.clipboard.writeText)
		return navigator.clipboard.writeText(text).then(function() { notifyInfo(_('Copied to clipboard.')); }).catch(notifyError);
	var node = E('textarea', { style: 'position:fixed;left:-10000px;top:-10000px;opacity:0' });
	node.value = text;
	document.body.appendChild(node);
	node.focus();
	node.select();
	try { document.execCommand('copy'); notifyInfo(_('Copied to clipboard.')); }
	catch (error) { notifyError(error); }
	node.remove();
	return Promise.resolve();
}

function badge(text, kind) {
	return E('span', { class: 'label ' + (kind || 'notice') }, text);
}

function configState(value) {
	return ({
		applied: [ _('Applied'), 'success' ],
		reload_required: [ _('Reload required'), 'warning' ],
		disabled: [ _('Disabled'), 'notice' ],
		stopped: [ _('Stopped unexpectedly'), 'warning' ],
		incompatible: [ _('Incompatible schema'), 'warning' ]
	}[value] || [ value || _('Unknown'), 'warning' ]);
}

function counter(data, key) {
	var value = data && data.counters && data.counters[key];
	return value && Number(value.packets) || 0;
}

function stringify(value) {
	return value == null ? '' : JSON.stringify(value, null, 2);
}

function confirm(title, message, label, callback) {
	ui.showModal(title, [
		E('p', {}, message),
		E('div', { class: 'right' }, [
			E('button', { class: 'btn', click: ui.hideModal }, _('Cancel')),
			' ',
			E('button', {
				class: 'btn cbi-button-negative important',
				click: function() {
					ui.hideModal();
					return Promise.resolve(callback()).catch(notifyError);
				}
			}, label || _('Confirm'))
		])
	]);
}

return baseclass.extend({
	errorText: errorText,
	notifyError: notifyError,
	notifyWarnings: notifyWarnings,
	notifyInfo: notifyInfo,
	copyText: copyText,
	badge: badge,
	configState: configState,
	counter: counter,
	stringify: stringify,
	confirm: confirm
});
