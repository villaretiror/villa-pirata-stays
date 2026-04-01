import"./index-DcoaHhcL.js";import{f as r}from"./format-CbnCsnfa.js";import{e as n}from"./es-C2VTmLms.js";Promise.resolve();const i=e=>{try{return r(new Date(e+"T12:00:00"),"dd MMM yyyy",{locale:n})}catch{return e}},l=e=>`¡Hola! Confirmo mi reserva en *${e.propertyName}*.

👤 Huésped: ${e.guestName}
📅 Check-in: ${e.checkIn}
📅 Check-out: ${e.checkOut}
💰 Total: $${e.total}
💳 Pago: ${e.method||"Pendiente"}

¡Estamos muy emocionados! 🏝️`,m=(e,o)=>`https://wa.me/${e.replace(/\D/g,"")}?text=${encodeURIComponent(o)}`,p=e=>`¡Hola ${e.guestName}! Solo quería saludarte y confirmar que ya estamos listos para recibirte en ${e.propertyName}. El código de acceso para tu llegada será: ${e.accessCode}. ¿Tienes alguna duda sobre la ubicación (${e.googleMapsLink||""}) o el check-in?`,u=async e=>(console.warn("importPropertyFromUrl no implementado en esta versión consolidada."),null);export{m as a,p as b,i as f,l as g,u as i};
