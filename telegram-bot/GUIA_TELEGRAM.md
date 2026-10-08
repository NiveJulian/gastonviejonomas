# 📱 Guía Rápida: Conectar FinanzaHogar a Telegram (24/7 Serverless)

Con esta integración podrás:
- **Sacarle una foto a un ticket/factura desde Telegram** y que se guarde en tu **Google Drive** y en tu **Google Sheets** automáticamente.
- **Consultar tu saldo libre y fondo de emergencia** en cualquier momento con `/saldo`.
- **Validar compras** antes de gastar con `/puedo [monto] [concepto]`.
- **Hacer consultas financieras directas** a tu Asesor IA con Omniroute.

---

## 🚀 Paso 1: Crear tu Bot en Telegram (30 segundos)

1. Abre la aplicación de Telegram en tu celular o PC.
2. En el buscador de Telegram busca el usuario oficial: **`@BotFather`** (tiene la tilde azul de verificación).
3. Presiona **Iniciar** y envíale el comando:
   ```text
   /newbot
   ```
4. Elige un nombre para tu bot (ejemplo: `Mi Finanza Hogar`).
5. Elige un nombre de usuario que termine en `bot` (ejemplo: `mi_finanza_casa_bot`).
6. BotFather te responderá felicitándote y te entregará tu **Token HTTP API**, que se ve así:
   `7123456789:AAFlkjasd_92834jklasdjlkasjd`

---

## ☁️ Paso 2: Activar el Bot 24/7 en Google Apps Script (Sin dejar tu PC prendida)

Dado que ya tienes tu archivo `Code.gs` en Google Sheets:

1. Ve a tu hoja de Google Sheets y haz clic en **Extensiones → Apps Script**.
2. En la línea 17 del archivo `Code.gs`, verás:
   ```javascript
   const TELEGRAM_BOT_TOKEN = "PEGA_AQUI_TU_TOKEN_DE_BOTFATHER";
   ```
   Reemplaza ese texto por el token que te dio BotFather.
3. Haz clic en el icono de **Guardar** (disquete).
4. Haz clic en **Implementar → Administrar implementaciones → Editar (icono de lápiz) → Nueva versión → Implementar**.
5. En la barra superior de Apps Script, en el desplegable de funciones al lado de "Depurar", selecciona la función:
   **`activarWebhookTelegram`**
   y presiona **Ejecutar**.
6. Google te mostrará un mensaje confirmando: `{"ok":true,"result":true,"description":"Webhook was set"}`.

> **¡Listo!** A partir de este segundo tu bot está activo en la nube de Google las 24 horas del día.

---

## 💬 Paso 3: Cómo usarlo desde Telegram

Abre el chat con tu nuevo bot en Telegram y prueba:

### 1. Registrar un gasto con foto de ticket
Envía una foto de una factura o ticket y escribe en el pie de foto:
```text
18000 Nafta Shell
```
El bot descarga la foto, la sube a tu **Google Drive** en la carpeta `Comprobantes Finanzas`, inserta el gasto en **Google Sheets** y te devuelve el enlace directo.

### 2. Consultar tu estado financiero
Escribe:
```text
/saldo
```
Te responderá al segundo:
```text
Estado financiero:
- Saldo libre disponible: $ 294.000
- Total gastado este mes: $ 574.000
- Gastos fijos del hogar: $ 393.000
- Fondo de emergencia intocable: $ 950.000
```

### 3. Evaluar una compra ("¿Puedo comprar esto?")
Escribe:
```text
/puedo 35000 Zapatillas
```
Te dirá si tu saldo libre lo cubre o si afectaría tu fondo de emergencia.

### 4. Preguntas libres al Asesor IA
Pregúntale cualquier duda de presupuesto, por ejemplo:
```text
Necesito presupuestar combustible para el mes si cargo $ 18000 cada 3 dias con el litro a $ 2300
```
Te responderá con el desglose numérico exacto sin adornos.
