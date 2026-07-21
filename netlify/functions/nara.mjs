const json = (statusCode, body) => ({ statusCode, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": process.env.PUBLIC_SITE_URL || "*", "access-control-allow-headers": "content-type, authorization" }, body: JSON.stringify(body) });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Metode tidak didukung." });
  if (!process.env.QWEN_API_BASE_URL || !process.env.QWEN_API_KEY) return json(503, { error: "Nara belum dihubungkan ke server inference." });
  let input;
  try { input = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Payload JSON tidak valid." }); }
  const message = String(input.message || "").trim();
  if (!message || message.length > 8000) return json(400, { error: "Pesan wajib diisi dan maksimal 8.000 karakter." });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${process.env.QWEN_API_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.QWEN_API_KEY}` },
      body: JSON.stringify({ model: process.env.QWEN_MODEL || "Qwen/Qwen3.5-4B", temperature: 0.35, max_tokens: 1800, messages: [
        { role: "system", content: "Anda adalah Nara, asisten Ngeblogging berbahasa Indonesia. Berikan bantuan editorial yang akurat, terstruktur, ringkas, dan tidak mengarang fakta. Jangan pernah menerbitkan atau menghapus konten tanpa konfirmasi eksplisit pengguna." },
        { role: "user", content: message },
      ] }),
    });
    if (!response.ok) return json(502, { error: "Layanan Nara sedang tidak tersedia." });
    const data = await response.json();
    return json(200, { answer: data.choices?.[0]?.message?.content || "Nara belum menghasilkan jawaban.", model: data.model });
  } catch (error) {
    return json(error.name === "AbortError" ? 504 : 500, { error: error.name === "AbortError" ? "Nara melewati batas waktu. Coba lagi." : "Terjadi gangguan pada Nara." });
  } finally { clearTimeout(timer); }
}
