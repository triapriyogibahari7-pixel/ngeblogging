export const fonts=Object.freeze([
'Roboto|Open Sans|Lato|Montserrat|Oswald|Raleway|Poppins|Nunito|Ubuntu|Inter',
'Merriweather|Lora|PT Serif|Playfair Display|Libre Baskerville|Crimson Text|Bitter|Arvo|Vollkorn|Spectral',
'Fira Sans|Work Sans|Rubik|Karla|Barlow|Cabin|Hind|Mukta|Heebo|Assistant',
'Quicksand|Josefin Sans|Dosis|Comfortaa|Varela Round|Maven Pro|M PLUS Rounded 1c|Signika|Asap|Overpass',
'Roboto Slab|Zilla Slab|Josefin Slab|Alfa Slab One|Patua One|Rokkitt|Crete Round|Bree Serif|Slabo 27px|Alegreya',
'Inconsolata|Fira Code|JetBrains Mono|Source Code Pro|IBM Plex Mono|Space Mono|Roboto Mono|Ubuntu Mono|Cousine|DM Mono',
'Dancing Script|Pacifico|Lobster|Caveat|Satisfy|Great Vibes|Sacramento|Allura|Parisienne|Cookie',
'Amatic SC|Permanent Marker|Shadows Into Light|Indie Flower|Patrick Hand|Kalam|Handlee|Architects Daughter|Gloria Hallelujah|Schoolbell',
'Anton|Bebas Neue|Righteous|Fredoka|Bungee|Abril Fatface|Cinzel|Cormorant Garamond|Prata|DM Serif Display',
'Noto Sans|Noto Serif|PT Sans|PT Sans Narrow|Roboto Condensed|Fjalla One|Titillium Web|Exo 2|Rajdhani|Teko',
'DM Sans|Manrope|Mulish|Public Sans|Epilogue|Outfit|Plus Jakarta Sans|Sora|Urbanist|Figtree',
'Libre Franklin|Archivo|Chivo|Kanit|Prompt|Sarabun|IBM Plex Sans|IBM Plex Serif|Space Grotesk|Red Hat Display'
].flatMap(row=>row.split('|')));
export function fontUrl(name){if(!fonts.includes(name))throw new Error('FONT_NOT_ALLOWED');return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replaceAll('%20','+')}&display=swap`;}
const pending=new Map();
export async function loadEditorFont(name){fontUrl(name);if(pending.has(name))return pending.get(name);const task=(async()=>{const link=document.createElement('link');link.rel='stylesheet';link.href=fontUrl(name);try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('FONT_TIMEOUT')),15000);link.onload=()=>{clearTimeout(timer);resolve();};link.onerror=()=>{clearTimeout(timer);reject(new Error('FONT_STYLESHEET_FAILED'));};document.head.append(link);});const faces=await document.fonts.load(`16px "${name}"`,'Ngeblogging 0123456789');if(!faces.length||faces.some(face=>face.status!=='loaded'))throw new Error('FONT_NOT_LOADED');return name;}catch(error){link.remove();throw error;}})();pending.set(name,task);try{return await task;}catch(error){pending.delete(name);throw error;}}
