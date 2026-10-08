import type { Expense, Income, Investment, SavingsGoal, AppConfig, DrivePermission } from '../types/finance';

const SPREADSHEET_NAME = 'FinanzaHogar - Mis Finanzas';
const DRIVE_FOLDER_NAME = 'Comprobantes Finanzas';

/**
 * Verifica si existe la pestaña 'Ingresos' en la hoja de cálculo.
 * Si no existe (creada en versiones anteriores), la agrega automáticamente con sus encabezados.
 */
export async function ensureIncomeSheetExists(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const sheetsList = meta.sheets || [];
    const hasIncomeSheet = sheetsList.some(
      (s: any) => s.properties?.title?.toLowerCase() === 'ingresos'
    );

    if (hasIncomeSheet) {
      return;
    }

    // Crear pestaña 'Ingresos'
    const addSheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Ingresos',
                  gridProperties: { frozenRowCount: 1 },
                },
              },
            },
          ],
        }),
      }
    );

    if (!addSheetRes.ok) return;

    // Agregar encabezados de Ingresos
    const headersPayload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'Ingresos!A1:G1',
          values: [
            [
              'ID',
              'Fecha',
              'Descripción',
              'Categoría',
              'Monto',
              'Método de Cobro',
              'Notas',
            ],
          ],
        },
      ],
    };

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(headersPayload),
      }
    );
  } catch (err) {
    console.warn('[GoogleDirectService] Error asegurando pestaña Ingresos:', err);
  }
}

/**
 * Busca o crea la carpeta de comprobantes en Google Drive
 */
export async function findOrCreateDriveFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Crear carpeta si no existe
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const created = await createRes.json();
  const folderId = created.id;

  // Hacerla accesible con enlace para ver fotos
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  } catch {}

  return folderId;
}

/**
 * Busca si ya existe la hoja de Finanzas o la crea automáticamente con todas las tablas
 */
export async function findOrCreateSpreadsheet(
  accessToken: string,
  storedSpreadsheetId?: string
): Promise<{ spreadsheetId: string; isNew: boolean }> {
  // 1. Si ya teníamos un ID guardado, verificar si sigue existiendo
  if (storedSpreadsheetId) {
    const checkRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${storedSpreadsheetId}?fields=id,name,trashed`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (!data.trashed) {
        await ensureIncomeSheetExists(accessToken, storedSpreadsheetId);
        return { spreadsheetId: storedSpreadsheetId, isNew: false };
      }
    }
  }

  // 2. Buscar en Google Drive por nombre exacto
  const query = encodeURIComponent(`name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const foundId = data.files[0].id;
      await ensureIncomeSheetExists(accessToken, foundId);
      return { spreadsheetId: foundId, isNew: false };
    }
  }

  // 3. Crear hoja de cálculo nueva con todas las tablas formateadas
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createPayload = {
    properties: {
      title: SPREADSHEET_NAME,
    },
    sheets: [
      {
        properties: {
          title: 'Gastos',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Ingresos',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Inversiones',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Ahorros',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Configuracion',
          gridProperties: { frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || 'Error al crear la hoja en Google Sheets');
  }

  const createdSheet = await createRes.json();
  const spreadsheetId = createdSheet.spreadsheetId;

  // 4. Agregar encabezados con formato
  const headersPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Gastos!A1:I1',
        values: [
          [
            'ID',
            'Fecha',
            'Descripción',
            'Categoría',
            'Tipo',
            'Monto',
            'Método de Pago',
            'URL Comprobante',
            'Notas',
          ],
        ],
      },
      {
        range: 'Ingresos!A1:G1',
        values: [
          [
            'ID',
            'Fecha',
            'Descripción',
            'Categoría',
            'Monto',
            'Método de Cobro',
            'Notas',
          ],
        ],
      },
      {
        range: 'Inversiones!A1:H1',
        values: [
          [
            'ID',
            'Fecha',
            'Activo / Entidad',
            'Tipo',
            'Monto Invertido',
            'Valor Actual',
            'Rendimiento Estimado %',
            'Notas',
          ],
        ],
      },
      {
        range: 'Ahorros!A1:G1',
        values: [
          [
            'ID',
            'Meta / Fondo',
            'Es Fondo Emergencia',
            'Monto Objetivo',
            'Monto Actual',
            'Fecha Límite',
            'Notas',
          ],
        ],
      },
      {
        range: 'Configuracion!A1:B4',
        values: [
          ['Clave', 'Valor'],
          ['IngresoMensual', '0'],
          ['Moneda', '$'],
          ['FondoEmergenciaMinimo', '0'],
        ],
      },
    ],
  };

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(headersPayload),
  });

  return { spreadsheetId, isNew: true };
}

/**
 * Lee todas las tablas directamente de Google Sheets
 */
export async function readAllFromGoogleSheetsDirect(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  expenses: Expense[];
  incomes: Income[];
  investments: Investment[];
  savings: SavingsGoal[];
  config: Partial<AppConfig>;
}> {
  // Asegurar que la pestaña Ingresos exista si la hoja proviene de una versión previa
  await ensureIncomeSheetExists(accessToken, spreadsheetId);

  const ranges = [
    'Gastos!A2:I',
    'Inversiones!A2:H',
    'Ahorros!A2:G',
    'Configuracion!A2:B',
    'Ingresos!A2:G',
  ];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&')}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Error al leer datos de Google Sheets');
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  // 1. Gastos
  const expensesRows = valueRanges[0]?.values || [];
  const expenses: Expense[] = expensesRows
    .filter((row: any[]) => row && (row[0] || row[1] || row[2]))
    .map((row: any[]) => ({
      id: String(row[0] || Math.random().toString(36).substring(2, 9)),
      date: String(row[1] || new Date().toISOString().split('T')[0]),
      description: String(row[2] || 'Gasto'),
      category: String(row[3] || 'Varios'),
      type: (String(row[4]).toLowerCase() === 'fijo' ? 'fijo' : 'variable') as 'fijo' | 'variable',
      amount: parseFloat(String(row[5]).replace(/[^0-9.-]+/g, '')) || 0,
      paymentMethod: String(row[6] || 'Efectivo'),
      receiptUrl: row[7] ? String(row[7]) : undefined,
      notes: row[8] ? String(row[8]) : undefined,
    }));

  // 2. Inversiones
  const invRows = valueRanges[1]?.values || [];
  const investments: Investment[] = invRows
    .filter((row: any[]) => row && (row[0] || row[1] || row[2]))
    .map((row: any[]) => ({
      id: String(row[0] || Math.random().toString(36).substring(2, 9)),
      date: String(row[1] || new Date().toISOString().split('T')[0]),
      asset: String(row[2] || 'Activo'),
      type: String(row[3] || 'Plazo Fijo') as any,
      investedAmount: parseFloat(String(row[4]).replace(/[^0-9.-]+/g, '')) || 0,
      currentValue: parseFloat(String(row[5]).replace(/[^0-9.-]+/g, '')) || 0,
      yieldPercent: parseFloat(String(row[6]).replace(/[^0-9.-]+/g, '')) || 0,
      notes: row[7] ? String(row[7]) : undefined,
    }));

  // 3. Ahorros
  const savingsRows = valueRanges[2]?.values || [];
  const savings: SavingsGoal[] = savingsRows
    .filter((row: any[]) => row && (row[0] || row[1]))
    .map((row: any[]) => ({
      id: String(row[0] || Math.random().toString(36).substring(2, 9)),
      name: String(row[1] || 'Meta'),
      isEmergencyFund: String(row[2]).toUpperCase() === 'SI' || String(row[2]) === 'true',
      targetAmount: parseFloat(String(row[3]).replace(/[^0-9.-]+/g, '')) || 0,
      currentAmount: parseFloat(String(row[4]).replace(/[^0-9.-]+/g, '')) || 0,
      deadline: row[5] ? String(row[5]) : undefined,
      notes: row[6] ? String(row[6]) : undefined,
    }));

  // 4. Configuración
  const configRows = valueRanges[3]?.values || [];
  const configMap: Record<string, any> = {};
  configRows.forEach((row: any[]) => {
    if (row && row[0]) {
      configMap[row[0]] = row[1];
    }
  });

  // 5. Ingresos
  const incomesRows = valueRanges[4]?.values || [];
  const incomes: Income[] = incomesRows
    .filter((row: any[]) => row && (row[0] || row[1] || row[2]))
    .map((row: any[]) => ({
      id: String(row[0] || Math.random().toString(36).substring(2, 9)),
      date: String(row[1] || new Date().toISOString().split('T')[0]),
      description: String(row[2] || 'Ingreso'),
      category: String(row[3] || 'Otros Ingresos'),
      amount: parseFloat(String(row[4]).replace(/[^0-9.-]+/g, '')) || 0,
      paymentMethod: row[5] ? String(row[5]) : undefined,
      notes: row[6] ? String(row[6]) : undefined,
    }));

  return {
    expenses,
    incomes,
    investments,
    savings,
    config: {
      monthlyIncome: parseFloat(String(configMap['IngresoMensual'] || '0')) || 0,
      currency: configMap['Moneda'] || '$',
      emergencyFundMinimum: parseFloat(String(configMap['FondoEmergenciaMinimo'] || '0')) || 0,
      telegramBotToken: configMap['TelegramToken'] || '',
      telegramChatId: configMap['TelegramChatId'] || '',
    },
  };
}

/**
 * Guarda o actualiza la configuración en la pestaña Configuracion de Google Sheets
 */
export async function updateConfigDirect(
  accessToken: string,
  spreadsheetId: string,
  config: Partial<AppConfig>
): Promise<void> {
  const rows: [string, string][] = [['Clave', 'Valor']];
  if (config.monthlyIncome !== undefined) rows.push(['IngresoMensual', String(config.monthlyIncome)]);
  if (config.currency !== undefined) rows.push(['Moneda', String(config.currency)]);
  if (config.emergencyFundMinimum !== undefined) rows.push(['FondoEmergenciaMinimo', String(config.emergencyFundMinimum)]);
  if (config.telegramBotToken !== undefined) rows.push(['TelegramToken', String(config.telegramBotToken)]);
  if (config.telegramChatId !== undefined) rows.push(['TelegramChatId', String(config.telegramChatId)]);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Configuracion!A1:B${rows.length}?valueInputOption=USER_ENTERED`;
  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  });
}

/**
 * Agrega un gasto directamente a Google Sheets
 */
export async function appendExpenseDirect(
  accessToken: string,
  spreadsheetId: string,
  expense: Expense,
  receiptUrl?: string
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Gastos!A:I:append?valueInputOption=USER_ENTERED`;
  const row = [
    expense.id,
    expense.date,
    expense.description,
    expense.category,
    expense.type,
    expense.amount,
    expense.paymentMethod,
    receiptUrl || expense.receiptUrl || '',
    expense.notes || '',
  ];

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
}

/**
 * Agrega un ingreso directamente a Google Sheets
 */
export async function appendIncomeDirect(
  accessToken: string,
  spreadsheetId: string,
  income: Income
): Promise<void> {
  await ensureIncomeSheetExists(accessToken, spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Ingresos!A:G:append?valueInputOption=USER_ENTERED`;
  const row = [
    income.id,
    income.date,
    income.description,
    income.category,
    income.amount,
    income.paymentMethod || '',
    income.notes || '',
  ];

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
}

/**
 * Elimina directamente una fila por ID en la pestaña especificada de Google Sheets
 */
export async function deleteRowDirect(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  id: string
): Promise<void> {
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const targetSheet = (meta.sheets || []).find(
      (s: any) => s.properties?.title?.toLowerCase() === sheetTitle.toLowerCase()
    );
    if (!targetSheet) return;

    const numericSheetId = targetSheet.properties.sheetId;

    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:A`;
    const valuesRes = await fetch(valuesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!valuesRes.ok) return;

    const valuesData = await valuesRes.json();
    const rows = valuesData.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r && String(r[0]).trim() === String(id).trim());

    if (rowIndex === -1) return;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: numericSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn(`[GoogleDirectService] Error eliminando fila ${id} de ${sheetTitle}:`, err);
  }
}

/**
 * Agrega una inversión directamente a Google Sheets
 */
export async function appendInvestmentDirect(
  accessToken: string,
  spreadsheetId: string,
  investment: Investment
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inversiones!A:H:append?valueInputOption=USER_ENTERED`;
  const row = [
    investment.id,
    investment.date,
    investment.asset,
    investment.type,
    investment.investedAmount,
    investment.currentValue,
    investment.yieldPercent || 0,
    investment.notes || '',
  ];

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
}

/**
 * Agrega o actualiza una meta de ahorro directamente a Google Sheets
 */
export async function appendSavingsDirect(
  accessToken: string,
  spreadsheetId: string,
  goal: SavingsGoal
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Ahorros!A:G:append?valueInputOption=USER_ENTERED`;
  const row = [
    goal.id,
    goal.name,
    goal.isEmergencyFund ? 'SI' : 'NO',
    goal.targetAmount,
    goal.currentAmount,
    goal.deadline || '',
    goal.notes || '',
  ];

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });
}

/**
 * Sube una imagen directamente a Google Drive en la carpeta de comprobantes
 */
export async function uploadReceiptToDriveDirect(
  accessToken: string,
  folderId: string,
  base64Data: string,
  filename?: string
): Promise<string> {
  try {
    let mimeType = 'image/jpeg';
    let pureBase64 = base64Data;

    if (base64Data.includes(';base64,')) {
      const parts = base64Data.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      pureBase64 = parts[1];
    }

    // Convertir Base64 a Blob binario
    const byteCharacters = atob(pureBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const safeName = filename || `comprobante_${Date.now()}.jpg`;

    // Upload multipart a Google Drive API v3
    const metadata = {
      name: safeName,
      parents: [folderId],
    };

    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaPartHeader = `${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    const multipartBody = new Blob([metadataPart, mediaPartHeader, pureBase64, closeDelimiter], {
      type: `multipart/related; boundary=${boundary}`,
    });

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const err = await res.json();
      console.warn('Error subiendo a Drive:', err);
      return '';
    }

    const file = await res.json();

    // Asignar permiso de lectura pública
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });
    } catch {}

    return file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
  } catch (err) {
    console.error('Error en uploadReceiptToDriveDirect:', err);
    return '';
  }
}

/**
 * Consulta la lista de usuarios con permisos sobre la hoja
 */
export async function listSpreadsheetPermissions(
  accessToken: string,
  spreadsheetId: string
): Promise<DrivePermission[]> {
  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?fields=permissions(id,displayName,emailAddress,role,type,photoLink)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.permissions || [];
}

/**
 * Invita a un usuario por email compartiéndole la hoja de Google Sheets
 */
export async function shareSpreadsheetWithUser(
  accessToken: string,
  spreadsheetId: string,
  email: string,
  role: 'reader' | 'writer' = 'reader'
): Promise<DrivePermission> {
  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role,
      type: 'user',
      emailAddress: email.trim(),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Error al compartir la hoja con el usuario');
  }

  return await res.json();
}

/**
 * Revoca el acceso de un usuario eliminando su permiso en Google Drive
 */
export async function revokeSpreadsheetPermission(
  accessToken: string,
  spreadsheetId: string,
  permissionId: string
): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions/${permissionId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Error al revocar el permiso');
  }
}
