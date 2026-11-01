import React from 'react';
import {createRoot} from 'react-dom/client';
history.replaceState(history.state,'',location.pathname);
const root=createRoot(document.getElementById('domain-order-status-root'));
const orderRoute=/^\/domains\/orders\/DOM-[a-f0-9]{40}\/?$/;
if(orderRoute.test(location.pathname)){
 import('./DomainOrderStatusPage.jsx').then(({default:Page})=>root.render(<Page/>)).catch(()=>root.render(<p role="alert">Status pesanan belum dapat dimuat. Perbarui halaman; jangan membuat pembayaran ulang.</p>));
}else{
 root.render(<p role="alert">Halaman pembelian domain terpisah sudah dihapus. Masuk ke Studio, pilih situs yang sedang dikelola, lalu buka Domain dan publikasi.</p>);
}
