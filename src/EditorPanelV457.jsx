import React from 'react';
export default function EditorPanelV457({tab,tabs,label,expanded=false,children}){return <details className="ce457-panel" hidden={!tabs.includes(tab)} open={expanded}><summary>{label}</summary>{children}</details>;}
