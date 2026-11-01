import React from 'react';
import {createRoot} from 'react-dom/client';
history.replaceState(history.state,'',location.pathname);
const root=createRoot(document.getElementById('domain-order-status-root'));
import('./DomainOrderStatusPage.jsx').then(({default:Page})=>root.render(<Page/>)).catch(()=>root.render(<p role="alert">Halaman status belum dapat dimuat. Perbarui halaman; jangan membuat pembayaran ulang.</p>));
