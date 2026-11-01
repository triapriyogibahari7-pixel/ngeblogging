import React from 'react';
import {createRoot} from 'react-dom/client';
history.replaceState(history.state,'',location.pathname);
const root=createRoot(document.getElementById('domain-order-status-root'));
const purchase=location.pathname==='/domains'||location.pathname==='/domains/';
(purchase?import('./DomainPurchasePage.jsx'):import('./DomainOrderStatusPage.jsx')).then(({default:Page})=>root.render(<Page/>)).catch(()=>root.render(<p role="alert">Halaman domain belum dapat dimuat. Perbarui halaman; jangan membuat pembayaran ulang.</p>));
