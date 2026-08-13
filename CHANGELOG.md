# Changelog

## 1.0.4-r8 / 4.0.0-r30 - 2026-08-13

- Make newly added steps transactional so dismissing the editor removes the
  temporary UCI section.
- Keep the last known service status when polling fails and display a standard
  LuCI warning instead of reporting an RPC failure as a disabled service.
- Normalize table action cells and button groups, and limit sticky positioning
  to the ordered-step table cells.
- Centralize translatable step parameter labels, remove unused browser APIs,
  and align direction and log terminology with the rest of the interface.
- Correct CI artifact versions and publish repository metadata.

- Keep the all-traffic risk note as the standard field description beneath
  Interception mode, and align the processing-step description with the
  Profile-order description.
- Center the sticky processing-step action heading and button group within its
  content-sized column while overriding theme-level negative margins.
- Use LuCI's standard `cbi-section-table-row` class for the Zapret2 status
  data row, matching the Subpipe status table and Argon's normal background.

- Declare the real build-only `libcap` dependency required by upstream
  `nfqws2` headers.
- Reject overlapping `initial` and `keepalive` port filters instead of silently
  applying keepalive interception to the shared port.
- Roll back nftables rules and runtime metadata when the applied-state commit
  cannot be completed.
- Make destructive device checks preserve pre-existing lists and service
  runtime state.
- Synchronize and review the complete Simplified Chinese catalog.
- Add strict translation, ShellCheck and verified OpenWrt SDK package-build
  gates to CI.
- Use LuCI theme semantic colors consistently and revise user-facing text to
  follow OpenWrt terminology and tone.
- Show each Profile's state together with an explicit enable or disable action;
  the button stages the change without implicitly saving or reloading the service.
- Replace the custom log viewer with a bounded, read-only LuCI form matching
  the Subpipe log page interaction and refresh behavior.
- Replace expanded Profile cards with an ordered overview and focused
  workspace, using explicit LuCI-style enable and disable actions.
- Keep the full ordered-step table within its own horizontal scroll area and
  consistently invalidate stale candidate-validation results after edits.
- Align Profile overview text consistently and keep the focused workspace
  heading free of the redundant enabled-state label.
- Standardize page hierarchy, action groups, table alignment and alert
  semantics across all four LuCI pages without private CSS.
- Remove the Settings-page configuration status, manual validation and runtime
  dump controls while retaining mandatory validation on save.
- Use the service name as the Zapret2 page heading, move service controls into
  the status table, and use the standard Form.Map description layout on the
  Profiles page.
- Keep Profile lifecycle actions in the ordered overview; the selected Profile
  workspace now contains only its ordered processing steps.
- Remove the all-traffic acknowledgement gate while retaining the conditional
  proxy/VPN interception warning. The former UCI key is accepted and retained
  in the default file solely to preserve existing conffiles during upgrades.
- Use standard table rows and compact action columns so status and Profile
  controls align consistently in LuCI themes, including Argon.
- Apply the same compact action-column treatment to ordered steps, and place
  their add control below the table without a redundant section heading.
