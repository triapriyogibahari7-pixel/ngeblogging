export const RETIRED_COMPAT_VALUES=Object.freeze({
  NARA_FALLBACK_WORKER_COMPAT:'worker-v22.mjs',
  STUDIO_DIRECT_SHELL_BOOT_RELEASE:'studio-direct-shell-boot-v299-20260805',
  STUDIO_MODE_STARTUP_RELEASE:'studio-mode-startup-authority-v297-20260805',
  STUDIO_STARTUP_RELEASE:'studio-startup-direct-data-v292-20260805',
  AUTH_STUDIO_HANDOFF_RELEASE:'auth-session-handoff-v292-20260805'
});
export const RETIRED_RELEASE_VALUES=Object.freeze({
  NARA_PRODUCTION_PROBE:Object.freeze(['passed']),
  STUDIO_STABILITY_RELEASE:Object.freeze(['studio-theme-code-editor-v344-20260807','studio-shell-authority-v298-20260805']),
  STUDIO_THEME_CODE_EDITOR_PREVIOUS_RELEASE:Object.freeze(['studio-theme-code-editor-v343-20260807']),
  STUDIO_THEME_CODE_EDITOR_BASE_RELEASE:Object.freeze(['studio-theme-code-editor-v342-20260807']),
  STUDIO_PRODUCTION_POLISH_RELEASE:Object.freeze(['studio-production-polish-v323-20260806']),
  STUDIO_SCREENSHOT_HOTFIX_RELEASE:Object.freeze(['studio-screenshot-hotfix-v318-20260806']),
  STUDIO_CONTENT_EDITOR_DESKTOP_SITE_COMPAT:Object.freeze(['studio-content-editor-desktop-site-v310-20260806']),
  STUDIO_SIDEBAR_DIRECT_RELEASE:Object.freeze(['studio-sidebar-direct-v300-20260805'])
});
export const LEGACY_VARIABLE_REMOVALS=Object.freeze(['UI_V37_WORKER_COMPAT','UI_V35_RELEASE_COMPAT','UI_V35_WORKER_COMPAT',...Object.keys(RETIRED_COMPAT_VALUES),...Object.keys(RETIRED_RELEASE_VALUES)]);
export function assertLegacyVariableRemoval(binding){
  if(!LEGACY_VARIABLE_REMOVALS.includes(binding?.name))throw Error('UNKNOWN_RETIREMENT_TARGET');
  if(binding.type!=='plain_text')throw Error('REMOVAL_TARGET_IS_NOT_PLAIN_TEXT');
  if(Object.hasOwn(RETIRED_COMPAT_VALUES,binding.name)&&binding.text!==RETIRED_COMPAT_VALUES[binding.name])throw Error('RETIREMENT_VALUE_CHANGED');
  if(Object.hasOwn(RETIRED_RELEASE_VALUES,binding.name)&&!RETIRED_RELEASE_VALUES[binding.name].includes(binding.text))throw Error('RETIREMENT_VALUE_CHANGED');
}
