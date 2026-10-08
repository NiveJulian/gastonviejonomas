# 💰 GASTONAPP: Control de Gastos, Inversiones y Ahorros con Validador Inteligente & Asesor IA

Una aplicación web moderna, ágil y visualmente atractiva para el control de la economía de tu casa, sincronizada con **Google Sheets** como base de datos y **Google Drive** para almacenar las fotos de facturas y tickets de comprobantes, complementada con un **Asesor Financiero IA conectado a Omniroute LLM**.

---

## ✨ Características Principales

1. **🏠 Gastos del Hogar:**
   - Registro de gastos fijos y variables.
   - **📸 Fotos de comprobantes a Google Drive:** Toma fotos de tickets o facturas y se guardan directamente en tu carpeta de Drive, insertando el enlace directo en tu Google Sheet.

2. **🚦 Validador Inteligente de Compras ("¿Puedo comprar esto?"):**
   - Evalúa si puedes permitirte una compra antes de sacar plata con semáforo inteligente (🟢 Aprobado / 🟡 Advertencia / 🔴 Bloqueado para proteger tu Fondo de Emergencia).

3. **⚖️ Destinar Fondos para Categorías Faltantes:**
   - Detecta categorías deficitarias (ej: fondo de emergencia incompleto o metas retrasadas) y sugiere la distribución matemática del dinero libre con botón para aplicarla en 1 clic.

4. **🎯 Calculadora de Confort Financiero (Regla 50/30/20):**
   - Analiza tus gastos esenciales y calcula exactamente cuánto deberías ganar al mes para vivir cómodo y sin estrés. Incluye simulador con controles deslizantes.

5. Asesor Financiero IA Personalizable:
   - Chat conversacional inteligente integrado con tus numeros reales en tiempo real.
   - Compatible con cualquier servidor LLM u endpoint estilo OpenAI (OpenAI, Ollama, vLLM, Omniroute).
   - Incorpora fallback heuristico local si no se configura una API externa.

---

## Configuracion del Asesor IA / LLM

Configura tus credenciales en el archivo `.env` o directamente en la seccion Ajustes de la aplicacion:

```env
VITE_OMNIROUTE_BASE_URL=https://api.openai.com/v1
VITE_OMNIROUTE_API_KEY=tu_api_key_aqui
VITE_OMNIR_MODEL=gpt-4o-mini
```

Cada usuario puede conectar su propio agente o modelo.

---

## 🚀 Cómo iniciar la aplicación

Abre una terminal en esta carpeta y ejecuta:

```bash
npm run dev
```

Luego abre en tu navegador el enlace mostrado (`http://localhost:5173`).
