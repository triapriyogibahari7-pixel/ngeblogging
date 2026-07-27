export const DOMAIN_MANAGER_V80_CSS = String.raw`
:host{all:initial;display:block;width:100%;contain:content;color:#17243d;font-family:"DM Sans",Arial,sans-serif;line-height:1.5}
*,*::before,*::after{box-sizing:border-box}
button,input{font:inherit}
button{cursor:pointer}
svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.app{width:100%;max-width:1480px;margin:0 auto;padding:30px clamp(16px,3.5vw,46px) 72px;background:#f5f7fb}
.hero{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin:0 0 22px}
.eyebrow{display:block;color:#2d6edf;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
h1,h2,h3,h4,p{margin:0}
h1{margin:8px 0 10px;color:#14233c;font-family:"Playfair Display",Georgia,serif;font-size:clamp(38px,4.8vw,66px);font-weight:600;line-height:1;letter-spacing:-.035em}
.hero p{max-width:880px;color:#6f7c90;font-size:13px;line-height:1.65}
.btn,.link{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:11px;padding:10px 14px;text-decoration:none;font-size:12px;font-weight:850}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.primary{background:#2d6edf;color:#fff}
.btn.secondary,.link{background:#edf3ff;color:#2d6edf}
.btn.danger{background:#fff0f2;color:#a73544}
.card{margin:0 0 16px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 32px rgba(25,49,91,.05);overflow:hidden}
.notice{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;border-color:#efcfd5;background:#fff2f4}
.notice b{display:block;color:#8f2e3a}.notice p{color:#8d5660;font-size:12px}
.workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,430px);gap:20px;align-items:center;padding:20px 22px;background:linear-gradient(135deg,#fff,#f4f8ff)}
.workspace h2{margin:5px 0;color:#17243d;font-size:24px}.workspace p{color:#6d7b91;font-size:12px;overflow-wrap:anywhere}
.workspace aside{padding:14px 16px;border:1px solid #dbe4f0;border-radius:14px;background:#fff}.workspace aside b{font-size:12px}.workspace aside p{margin-top:4px;font-size:11px;line-height:1.55}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 16px}
.metric{display:grid;grid-template-columns:34px minmax(0,1fr);gap:2px 10px;align-items:center;padding:15px 16px;border:1px solid #dfe6ef;border-radius:15px;background:#fff}
.metric svg{grid-row:1/3;color:#2d6edf}.metric span{color:#718096;font-size:11px}.metric b{font-size:22px}
.free{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:18px;align-items:center;padding:22px;background:linear-gradient(135deg,#fff,#f4f8ff)}
.iconbox{width:58px;height:58px;display:grid;place-items:center;border-radius:18px;background:#e9f1ff;color:#2d6edf}.iconbox svg{width:28px;height:28px}
.free h2{margin:5px 0;color:#17243d;font-size:22px;overflow-wrap:anywhere}.free p{color:#6f7c90;font-size:12px}.free aside{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.badge{display:inline-flex;align-items:center;border-radius:999px;padding:7px 10px;background:#fff3d6;color:#8c6616;font-size:10px;font-style:normal;font-weight:850}.badge.active{background:#e8f8ef;color:#17784f}.badge.danger{background:#fff0f2;color:#a73544}.badge.pending{background:#fff4da;color:#8b6518}
.section-head{display:grid;grid-template-columns:46px minmax(0,1fr);gap:14px;padding:22px;border-bottom:1px solid #e6ebf2}.section-head .iconbox{width:46px;height:46px;border-radius:14px}.section-head h2{margin:5px 0 6px;font-size:23px}.section-head p{max-width:850px;color:#6f7c90;font-size:12px;line-height:1.6}
.register-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end;padding:22px}
.field{display:grid;gap:7px}.field>span{font-size:12px;font-weight:850}.field small{color:#7a8799;font-size:11px}
.input{width:100%;min-width:0;height:48px;border:1px solid #cbd6e5;border-radius:12px;padding:0 14px;background:#fff;color:#17243d;outline:none}.input:focus{border-color:#2d6edf;box-shadow:0 0 0 3px rgba(45,110,223,.1)}
.provider-note{display:flex;align-items:center;gap:9px;margin:0 22px 22px;padding:12px 14px;border-radius:12px;background:#edf9f3;color:#1d754f;font-size:12px}
.domain-list-head,.audit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px;border-bottom:1px solid #e6ebf2}.domain-list-head h2,.audit-head h2{margin:5px 0 6px;font-size:23px}.domain-list-head p,.audit-head p{color:#6f7c90;font-size:12px}
.empty{min-height:220px;display:grid;place-items:center;padding:30px;text-align:center;color:#7a8798}.empty svg{width:34px;height:34px;color:#2d6edf}.empty h3{margin:10px 0 4px;color:#17243d}
.domain{margin:18px;border:1px solid #dce4ef;border-radius:18px;background:#fbfcfe;overflow:hidden}
.domain>header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px;background:#fff;border-bottom:1px solid #e5eaf1}.domain-name{display:grid;grid-template-columns:46px minmax(0,1fr);gap:13px;align-items:center}.domain-name .iconbox{width:46px;height:46px;border-radius:14px}.domain-name h3{margin:4px 0;font-size:20px;overflow-wrap:anywhere}.domain-name p{color:#6f7c90;font-size:12px}.domain-badges{display:flex;gap:7px;flex-wrap:wrap}
.ns{margin:16px;border:1px solid #dce4ef;border-radius:14px;overflow:hidden;background:#fff}.ns>header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:13px 14px;background:#f6f8fc}.ns>header b{display:block}.ns-row{display:grid;grid-template-columns:110px minmax(0,1fr) 40px;gap:10px;align-items:center;padding:12px 14px;border-top:1px solid #e7ebf1}.ns-row code{font-size:12px;overflow-wrap:anywhere}.icon-btn{width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:10px;background:#eef3fb;color:#2d6edf}
.domain-error{margin:16px;padding:12px 14px;border-radius:12px;background:#fff0f2;color:#a8323f;font-size:12px}
.actions{display:flex;gap:9px;flex-wrap:wrap;padding:0 18px 18px}
.routing{padding:18px;border-top:1px solid #e5eaf1;background:#fff}.routing h4{margin:4px 0;font-size:18px}.routing p{color:#6f7c90;font-size:12px}
.address{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:12px 0;border-top:1px solid #e8edf3}.address b,.address small{display:block;overflow-wrap:anywhere}.address small{margin-top:3px;color:#758196;font-size:11px}
.switch{min-width:104px;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:11px;padding:8px 12px;background:#edf1f6;color:#617087;font-size:11px;font-weight:850}.switch span{width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18)}.switch.on{background:#e8f8ef;color:#17784f}
.locked{border-radius:999px;padding:7px 11px;background:#e8f8ef;color:#17784f;font-size:10px;font-style:normal;font-weight:850}
.address-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin-top:12px;padding-top:14px;border-top:1px solid #e8edf3}.compound{display:grid;grid-template-columns:minmax(0,1fr) auto;border:1px solid #cad5e4;border-radius:12px;overflow:hidden}.compound .input{border:0;border-radius:0;box-shadow:none}.compound strong{display:flex;align-items:center;max-width:320px;padding:0 12px;background:#eef3fa;color:#65738a;font-size:11px;overflow-wrap:anywhere}
.audit-results{padding:0 22px 18px}.audit-row{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:11px;align-items:center;padding:12px 0;border-top:1px solid #e7ebf1}.audit-row>span{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#fff4da;color:#8b6518}.audit-row>span.ok{background:#e8f8ef;color:#17784f}.audit-row b,.audit-row small{display:block;overflow-wrap:anywhere}.audit-row small{color:#758196}.audit-row i{font-size:11px;font-style:normal;color:#617087}
.toast{position:fixed;right:18px;bottom:18px;z-index:2147483640;max-width:min(440px,calc(100vw - 36px));padding:13px 16px;border-radius:12px;background:#19345f;color:#fff;box-shadow:0 16px 36px rgba(9,28,59,.26);font-size:13px}.toast.danger{background:#a82f3d}
@media(max-width:1100px){.workspace{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.free{grid-template-columns:54px minmax(0,1fr)}.free aside{grid-column:1/-1;justify-content:flex-start}.register-form,.address-form{grid-template-columns:1fr}.register-form .btn,.address-form .btn{justify-self:start}}
@media(max-width:700px){.app{padding:20px 12px 52px}.hero{display:block}.hero .btn{margin-top:14px}.workspace,.free{padding:16px}.metrics{grid-template-columns:1fr 1fr}.section-head{grid-template-columns:40px minmax(0,1fr);padding:17px}.section-head .iconbox{width:40px;height:40px}.register-form{padding:17px}.provider-note{margin:0 17px 17px}.domain-list-head,.audit-head{display:block;padding:17px}.audit-head .btn{margin-top:12px}.domain{margin:12px}.domain>header{display:block}.domain-badges{margin-top:10px}.ns-row{grid-template-columns:1fr 40px}.ns-row span{grid-column:1/-1}.address{grid-template-columns:minmax(0,1fr) auto}.address .icon-btn{grid-column:2}.compound{grid-template-columns:1fr}.compound strong{max-width:none;min-height:38px}.audit-row{grid-template-columns:38px minmax(0,1fr)}.audit-row i{grid-column:2}.free h2{font-size:18px}}
`;
