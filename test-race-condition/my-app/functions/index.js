export const onRequest = async (context) => {
  return context.next();
};

// import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

// export default {
//   async fetch(request, env, ctx) {
//     try {
//       return await getAssetFromKV(
//         { request, waitUntil: ctx.waitUntil },
//         { ASSET_NAMESPACE: env.__STATIC_CONTENT }
//       );
//     } catch (err) {
//       // Fallback for missing files
//       return new Response("Not Found", { status: 404 });
//     }
//   },
// };
