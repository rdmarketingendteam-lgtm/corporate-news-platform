import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { billingEndpoints } from './billing/endpoints'
import { Articles } from './collections/Articles'
import { AuditLogs } from './collections/AuditLogs'
import { Authors } from './collections/Authors'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { PaymentEvents } from './collections/PaymentEvents'
import { Plans } from './collections/Plans'
import { Readers } from './collections/Readers'
import { Redirects } from './collections/Redirects'
import { Subscriptions } from './collections/Subscriptions'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { publishScheduledEndpoint } from './endpoints/cron'
import { healthEndpoint } from './endpoints/health'
import { searchEndpoint } from './endpoints/search'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isProduction = process.env.NODE_ENV === 'production'
const secret = process.env.PAYLOAD_SECRET
if (isProduction && (!secret || secret.length < 32)) {
  throw new Error('PAYLOAD_SECRET must be set to a random string of at least 32 characters in production')
}

const serverURL = process.env.CMS_URL || 'http://localhost:3001'
const webURL = process.env.WEB_URL || 'http://localhost:3000'
const trustedOrigins = [
  serverURL,
  webURL,
  ...(isProduction ? [] : ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3000']),
]

export default buildConfig({
  serverURL,
  secret: secret || 'dev-only-insecure-secret-change-me-0000000000',
  telemetry: false,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ` — ${process.env.PUBLICATION_NAME || 'Newsroom'} CMS` },
  },
  collections: [
    Articles,
    Categories,
    Tags,
    Authors,
    Media,
    Redirects,
    Users,
    Readers,
    Plans,
    Subscriptions,
    PaymentEvents,
    AuditLogs,
  ],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '', max: Number(process.env.DATABASE_POOL_MAX || 10) },
    // Dev pushes schema automatically; production uses committed migrations (`pnpm --filter cms migrate`).
    push: !isProduction && process.env.PAYLOAD_DB_PUSH !== 'false',
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
  }),
  sharp,
  graphQL: { disable: true },
  cors: trustedOrigins,
  csrf: trustedOrigins,
  upload: { limits: { fileSize: 15 * 1024 * 1024 } },
  endpoints: [...billingEndpoints, searchEndpoint, publishScheduledEndpoint, healthEndpoint],
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.EMAIL_FROM || 'news@example.com',
        defaultFromName: process.env.PUBLICATION_NAME || 'Newsroom',
      })
    : undefined,
  plugins: [
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      // keep the DB schema identical whether or not Blob is configured (local dev vs Vercel)
      alwaysInsertFields: true,
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Upload straight from the browser to Blob — avoids Vercel's 4.5 MB function body limit.
      clientUploads: true,
    }),
  ],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
