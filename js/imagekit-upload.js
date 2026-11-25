// ImageKit browser upload helper. Private-key signing happens in the Supabase Edge Function.
(function () {
  const config = window.AGASOBANUYE257_CONFIG || {};

  async function uploadImage(file, options = {}) {
    const client = options.client || window.AgasobanuyeDB?.client;
    if (!client) throw new Error("Supabase is not configured.");
    if (!config.imagekitPublicKey) throw new Error("Add imagekitPublicKey to supabase-config.js.");
    if (!file) throw new Error("Choose an image to upload.");
    if (!file.type?.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 15 * 1024 * 1024) throw new Error("Image must be 15 MB or smaller.");

    let authResult;
    try {
      authResult = await client.functions.invoke("imagekit-auth", { body: {} });
    } catch (error) {
      throw new Error("ImageKit authorization request failed. Confirm that the imagekit-auth Edge Function is deployed in this Supabase project. Details: " + (error?.message || "network error"));
    }
    const { data: auth, error: authError } = authResult || {};
    if (authError) {
      let detail = authError.message || "Could not authorize ImageKit upload.";
      try {
        const response = authError.context;
        if (response && typeof response.clone === "function") {
          const body = await response.clone().json().catch(() => null);
          if (body?.error) detail = body.error;
          else if (body?.message) detail = body.message;
          else if (response.status) detail += " (HTTP " + response.status + ")";
        }
      } catch (_) {}
      throw new Error("ImageKit authorization failed: " + detail + " Check Supabase Edge Functions → imagekit-auth → Logs and confirm IMAGEKIT_PRIVATE_KEY is set.");
    }
    if (!auth?.token || !auth?.signature || !auth?.expire) throw new Error("ImageKit authorization response was incomplete.");

    const form = new FormData();
    form.append("file", file);
    form.append("fileName", options.fileName || file.name);
    form.append("publicKey", config.imagekitPublicKey);
    form.append("token", auth.token);
    form.append("expire", String(auth.expire));
    form.append("signature", auth.signature);
    if (options.folder) form.append("folder", options.folder);
    if (options.tags?.length) form.append("tags", options.tags.join(","));

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.help || "ImageKit upload failed.");
    return { url: result.url, fileId: result.fileId, name: result.name, width: result.width, height: result.height };
  }

  window.AgasobanuyeImageKit = { uploadImage };
})();
