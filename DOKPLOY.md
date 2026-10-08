# Guía de Despliegue de GASTONAPP en Dokploy

Esta guía detalla los pasos para desplegar GASTONAPP en tu servidor utilizando [Dokploy](https://dokploy.com/), garantizando que la aplicación web y el agente de Telegram se ejecuten juntos, la configuración no se sobreescriba al hacer `git push`, y se preserve un flujo 100% de código abierto.

---

## 1. Características de la Configuración en Dokploy

- **Dockerfile Multi-Stage Unificado**: Compila la aplicación web estática (React + Vite + Tailwind) y la sirve mediante un servidor nativo Node.js Alpine ultraligero.
- **Ejecución Conjunta del Agente**: Si se define `TELEGRAM_BOT_TOKEN`, el servidor levanta y supervisa automáticamente el agente de Telegram en segundo plano con autoreinicio ante fallos.
- **Inyección Dinámica de Variables de Entorno**: El endpoint `/env-config.js` inyecta las variables configuradas en Dokploy al navegador en tiempo de ejecución. Al hacer un nuevo `git push`, Dokploy recompila el código pero **mantiene intactas tus variables de entorno**.
- **Persistencia de Datos**: El contenedor expone el volumen `/app/data` para almacenamiento persistente en el host.
- **Verificación de Salud Integrada**: El endpoint `/api/health` permite a Dokploy monitorear el estado del contenedor en tiempo real.

---

## 2. Paso a Paso para el Despliegue

### Paso 1: Crear la Aplicación en Dokploy

1. Accede a tu panel de Dokploy.
2. Selecciona tu Proyecto o crea uno nuevo (ejemplo: `Finanzas`).
3. Haz clic en **Create Service** y selecciona **Application**.
4. Asigna un nombre a la aplicación: `gastonapp`.

### Paso 2: Conectar el Repositorio de Git

1. En la pestaña **Source**, selecciona tu proveedor de Git (GitHub, GitLab, o Git genérico).
2. Selecciona el repositorio de GASTONAPP y la rama (ejemplo: `main`).
3. En **Build Type**, selecciona **Dockerfile**.
4. Deja la ruta del Dockerfile por defecto: `./Dockerfile` y contexto: `.`.

### Paso 3: Configurar el Puerto de Red

1. En la pestaña **General** de la aplicación:
   - **Port**: ingresa `3000`.
2. En la sección **Domains**:
   - Agrega tu dominio o subdominio (ejemplo: `gaston.tudominio.com`).
   - Activa el certificado SSL automático (Let's Encrypt / HTTPS).

### Paso 4: Configurar Variables de Entorno (Environment)

En la pestaña **Environment** de Dokploy, define las variables necesarias según tu configuración:

```bash
# Puerto del servidor (por defecto 3000)
PORT=3000

# Client ID de Google Cloud Console para inicio de sesión y Google Sheets (opcional pero recomendado)
VITE_GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com

# Proveedor LLM / Inteligencia Artificial (opcional)
VITE_OMNIROUTE_BASE_URL=https://api.openai.com/v1
VITE_OMNIROUTE_API_KEY=tu-api-key
VITE_OMNIR_MODEL=gpt-4o-mini

# Token de Telegram Bot de @BotFather (opcional, para activar el agente 24/7)
TELEGRAM_BOT_TOKEN=tu-telegram-bot-token

# Google Apps Script Web App URL (opcional si usas Apps Script en vez de OAuth directo)
VITE_APPS_SCRIPT_URL=
```

> **Nota sobre persistencia:** Estas variables se guardan en el panel de Dokploy en la base de datos del servidor, por lo que **nunca se borrarán ni se restablecerán cuando hagas un nuevo `git push`**.

### Paso 5: Configurar Volumen Persistente (Opcional)

Para blindar datos locales adicionales:
1. Dirígete a la pestaña **Volumes** o **Mounts** de la aplicación en Dokploy.
2. Agrega un nuevo montaje:
   - **Type**: Volume
   - **Name**: `gaston_data`
   - **Container Path**: `/app/data`

### Paso 6: Desplegar

1. Haz clic en el botón **Deploy** en la parte superior derecha de Dokploy.
2. Dokploy clonará el repositorio, ejecutará el Dockerfile multi-stage, levantará el servidor en el puerto 3000 y comenzará a responder.
3. Puedes revisar los registros en tiempo real en la pestaña **Logs**:
   - Verás el mensaje de confirmación del servidor web.
   - Si configuraste `TELEGRAM_BOT_TOKEN`, verás al agente de Telegram iniciando sesión y listo para recibir mensajes.

---

## 3. Flujo Continuo de Código Abierto y Nuevos Pushes

- Cada vez que hagas un `git push origin main` a tu repositorio:
  1. El webhook de Dokploy iniciará la reconstrucción de la imagen automáticamente.
  2. Tus variables de entorno definidas en Dokploy permanecerán intactas.
  3. Los datos de Google Sheets y Google Drive del usuario permanecen intactos en su cuenta de Google.
  4. Los datos locales almacenados en el navegador o en el volumen `/app/data` no se pierden.
