import app from '../server';

export default function handler(req: any, res: any) {
  // Ensure the URL maintains the /api prefix if Vercel strips it in certain routing modes
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
