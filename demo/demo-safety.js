// Safety controls for dynamically created V4 dialogs. No import or device access.
const demoSafety=()=>document.querySelectorAll('input[type="file"]').forEach(input=>{input.disabled=true;input.title='Importação desativada na demonstração';});
demoSafety();new MutationObserver(demoSafety).observe(document.body,{childList:true,subtree:true});
document.querySelector('#demo-close').onclick=document.querySelector('#demo-ok').onclick=()=>document.querySelector('#demo-dialog').close();
document.addEventListener('click',event=>{const button=event.target.closest('button');if(button&&/imprimir|whatsapp|câmera|escanear|exportar|scan-barcode/i.test(button.textContent+' '+button.id)){event.preventDefault();event.stopImmediatePropagation();demoNotice();}},true);
