import fetch from 'node-fetch';

const WEBHOOK_URL = process.env.VAPI_WEBHOOK_URL || 'http://localhost:3000/api/webhooks?source=vapi';
const SECRET = process.env.VAPI_WEBHOOK_SECRET || 'test_secret';

async function testAvailabilityTool() {
  console.log('🧪 Probando Herramienta Vapi - check_availability...');
  const payload = {
    message: {
      type: 'tool-calls',
      toolCallList: [
        {
          id: 'call_test123',
          function: {
            name: 'check_availability',
            arguments: JSON.stringify({
              propertyId: "1081171030449673920",
              startDate: "2026-05-01",
              endDate: "2026-05-03"
            })
          }
        }
      ]
    }
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vapi-secret': SECRET
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log(`Estatus: ${response.status}`);
  try {
     const data = JSON.parse(text);
     if (!data.results) throw new Error("Falta el objeto { results } requerido por Vapi.");
     if (data.results[0].toolCallId !== 'call_test123') throw new Error("toolCallId inconsistente.");
     console.log('✅ Prueba Exitosa. Formato perfecto de VAPI.');
     console.log(data);
  } catch(e: any) {
     console.error('❌ Error fatal en el Webhook:', e.message);
     console.error('Respuesta pura:', text);
     process.exit(1);
  }
}

async function runTests() {
   await testAvailabilityTool();
   console.log('Todas las integraciones de Vapi superadas.');
}

runTests();
