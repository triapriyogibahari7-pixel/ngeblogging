import {resolveEditorMode,currentEditorPreference} from './editor-mode-v463.mjs';
export function isDesktopEditorV459(environment){return resolveEditorMode(environment,environment.preference)==='desktop';}
export function editorDesktopV459(){if(typeof window==='undefined')return false;return isDesktopEditorV459({preference:currentEditorPreference(),viewportWidth:window.innerWidth,screenWidth:window.screen?.width,screenHeight:window.screen?.height,touchPoints:navigator.maxTouchPoints||0,coarse:window.matchMedia('(any-pointer:coarse)').matches,mobileHint:navigator.userAgentData?.mobile});}
