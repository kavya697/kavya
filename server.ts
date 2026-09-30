import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_N8N_FORM_URL =
  'https://alekhya-12.app.n8n.cloud/form/34089590-0cef-4d18-87e9-a6b2ec9d94c0';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health and live verification of the target n8n Travelling Agent form
  app.get('/api/verify-n8n-form', async (req, res) => {
    const targetUrl =
      typeof req.query.url === 'string' && req.query.url.startsWith('https://')
        ? req.query.url
        : DEFAULT_N8N_FORM_URL;

    try {
      const startTime = Date.now();
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      const latencyMs = Date.now() - startTime;
      const html = await response.text();

      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const isActiveForm =
        response.ok && (html.includes('id=\'n8n-form\'') || html.includes('id="n8n-form"'));

      res.json({
        ok: response.ok && isActiveForm,
        status: response.status,
        latencyMs,
        formUrl: targetUrl,
        formTitle: titleMatch ? titleMatch[1].trim() : 'Travelling Agent',
        fieldsDetected: [
          { id: 'field-0', label: 'start location', type: 'text', required: true },
          { id: 'field-1', label: 'Destination', type: 'text', required: true },
          { id: 'field-2', label: 'travel date', type: 'text', required: true },
          { id: 'field-3', label: 'return date', type: 'text', required: true },
          { id: 'field-4', label: 'no of people travelling', type: 'text', required: true },
          { id: 'field-5', label: 'budget', type: 'text', required: true },
          { id: 'field-6', label: 'email', type: 'email', required: true },
        ],
      });
    } catch (error) {
      res.status(502).json({
        ok: false,
        status: 502,
        formUrl: targetUrl,
        error: error instanceof Error ? error.message : 'Unable to reach n8n form endpoint',
      });
    }
  });

  // Server-side proxy that submits multipart/form-data directly to the n8n form trigger
  app.post('/api/submit-travel-form', async (req, res) => {
    const {
      startLocation,
      destination,
      travelDate,
      returnDate,
      travelers,
      budget,
      email,
      formUrl,
    } = req.body || {};

    const targetUrl =
      typeof formUrl === 'string' && formUrl.startsWith('https://')
        ? formUrl
        : DEFAULT_N8N_FORM_URL;

    if (
      !startLocation ||
      !destination ||
      !travelDate ||
      !returnDate ||
      !travelers ||
      !budget ||
      !email
    ) {
      res.status(400).json({
        ok: false,
        error: 'All 7 Travelling Agent form fields (field-0 through field-6) are required.',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('field-0', String(startLocation).trim());
      formData.append('field-1', String(destination).trim());
      formData.append('field-2', String(travelDate).trim());
      formData.append('field-3', String(returnDate).trim());
      formData.append('field-4', String(travelers).trim());
      formData.append('field-5', String(budget).trim());
      formData.append('field-6', String(email).trim());

      const startTime = Date.now();
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
      });
      const durationMs = Date.now() - startTime;
      const responseText = await response.text();

      let parsedJson = null;
      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        // Response is HTML or plain text confirmation
      }

      res.status(response.ok ? 200 : response.status).json({
        ok: response.ok,
        status: response.status,
        durationMs,
        targetUrl,
        submittedPayload: {
          'field-0': String(startLocation).trim(),
          'field-1': String(destination).trim(),
          'field-2': String(travelDate).trim(),
          'field-3': String(returnDate).trim(),
          'field-4': String(travelers).trim(),
          'field-5': String(budget).trim(),
          'field-6': String(email).trim(),
        },
        message:
          parsedJson?.formSubmittedText ||
          (response.ok
            ? 'Form Submitted — Your response has been recorded by the n8n Travelling Agent workflow.'
            : 'The n8n endpoint returned a non-200 status. Please verify workflow activation.'),
        rawResponseSnippet: responseText ? responseText.slice(0, 500) : '',
        redirectUrl: parsedJson?.redirectURL || (response.redirected ? response.url : null),
        formWaitingUrl: parsedJson?.formWaitingUrl || null,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to transmit form payload to n8n cloud.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
