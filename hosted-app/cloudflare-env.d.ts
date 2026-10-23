declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Operator-reviewed exact HTTPS origins, encoded as a JSON array. Empty disables server import. */
    TOOLKIT_IMPORT_ALLOWED_ORIGINS?: string;
  }
}
