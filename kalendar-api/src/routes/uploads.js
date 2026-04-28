import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../dbConn.js';
import { requireAuth } from '../middleware/auth.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploads = Router();

const ROOT = 'kalendar';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'kalendar_signed';

// Build the upload folder server-side so the client cannot pick arbitrary paths.
// kind ∈ { 'user-avatar', 'business-logo', 'business-banner', 'employee-avatar', 'service-image' }
async function resolveFolder(kind, params, user) {
  switch (kind) {
    case 'user-avatar':
      return `${ROOT}/users/${user.sub}`;

    case 'business-logo':
    case 'business-banner': {
      const slug = String(params.slug || '');
      const r = await db.query(
        'SELECT id FROM businesses WHERE slug = $1 AND owner_id = $2 AND active = true',
        [slug, user.sub]
      );
      if (r.rowCount === 0) return { error: 'Business not found or not owned by you', status: 403 };
      const sub = kind === 'business-logo' ? 'logo' : 'banner';
      return `${ROOT}/businesses/${slug}/${sub}`;
    }

    case 'employee-avatar': {
      const slug = String(params.slug || '');
      const employeeId = Number(params.employeeId);
      if (!employeeId) return { error: 'employeeId is required', status: 400 };
      const r = await db.query(
        `SELECT e.id FROM employees e
           JOIN businesses b ON b.id = e.business_id
          WHERE e.id = $1 AND b.slug = $2 AND b.owner_id = $3 AND b.active = true`,
        [employeeId, slug, user.sub]
      );
      if (r.rowCount === 0) return { error: 'Employee not found or not owned by you', status: 403 };
      return `${ROOT}/businesses/${slug}/employees/${employeeId}`;
    }

    case 'service-image': {
      const slug = String(params.slug || '');
      const serviceId = Number(params.serviceId);
      if (!serviceId) return { error: 'serviceId is required', status: 400 };
      const r = await db.query(
        `SELECT s.id FROM services s
           JOIN businesses b ON b.id = s.business_id
          WHERE s.id = $1 AND b.slug = $2 AND b.owner_id = $3 AND b.active = true`,
        [serviceId, slug, user.sub]
      );
      if (r.rowCount === 0) return { error: 'Service not found or not owned by you', status: 403 };
      return `${ROOT}/businesses/${slug}/services/${serviceId}`;
    }

    default:
      return { error: 'Unknown upload kind', status: 400 };
  }
}

// POST /api/uploads/sign
// Body: { kind, slug?, employeeId?, serviceId? }
// Returns: { timestamp, signature, apiKey, cloudName, uploadPreset, folder }
uploads.post('/sign', requireAuth, async (req, res) => {
  try {
    const { kind } = req.body || {};
    if (!kind) return res.status(400).json({ error: 'kind is required' });

    const folderOrErr = await resolveFolder(kind, req.body || {}, req.user);
    if (typeof folderOrErr !== 'string') {
      return res.status(folderOrErr.status).json({ error: folderOrErr.error });
    }
    const folder = folderOrErr;

    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder, upload_preset: UPLOAD_PRESET },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      folder,
    });
  } catch (err) {
    console.error('POST /api/uploads/sign failed:', err);
    res.status(500).json({ error: err.message || 'Failed to sign upload' });
  }
});

export default uploads;
