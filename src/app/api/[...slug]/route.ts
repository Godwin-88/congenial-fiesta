import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'

export const DELETE = (req: Request, args: { params: Promise<{ slug?: string[] }> }) => REST_DELETE(config)(req, args)
export const GET = (req: Request, args: { params: Promise<{ slug?: string[] }> }) => REST_GET(config)(req, args)
export const OPTIONS = (req: Request, args: { params: Promise<{ slug?: string[] }> }) => REST_OPTIONS(config)(req, args)
export const PATCH = (req: Request, args: { params: Promise<{ slug?: string[] }> }) => REST_PATCH(config)(req, args)
export const POST = (req: Request, args: { params: Promise<{ slug?: string[] }> }) => REST_POST(config)(req, args)
export const PUT = (req: Request, args: { params: Promise<{ slug?: string[] }> }) => REST_PUT(config)(req, args)
