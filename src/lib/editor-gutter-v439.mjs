export function editorGutterWidth(value){const count=Math.max(1,Math.min(10000,Math.floor(Number(value)||1)));return Math.max(40,Math.min(66,String(count).length*10+18));}
