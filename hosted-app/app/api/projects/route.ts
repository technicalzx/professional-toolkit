import { env } from "cloudflare:workers";
import { projectStore } from "../../../lib/projects/store.mjs";

export function GET(request: Request) {
  return projectStore(request, env.DB);
}
export function POST(request: Request) {
  return projectStore(request, env.DB);
}
export function DELETE(request: Request) {
  return projectStore(request, env.DB);
}
