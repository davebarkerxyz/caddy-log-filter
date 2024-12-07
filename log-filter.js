import { TextLineStream } from "jsr:@std/streams";

const host = Deno.env.get("HOST") ? Deno.env.get("HOST") : "0.0.0.0";
const port = Deno.env.get("PORT") ? Deno.env.get("PORT") : 9919;

let outFile;
let writer;
const outPath = Deno.env.get("LOG_FILE");
const encoder = new TextEncoder();
if (outPath) {
    outFile = await Deno.open(outPath, {write: true, read: true, append: true, create: true});
    writer = outFile.writable.getWriter();
}

const listener = Deno.listen({port: port, hostname: host});
for await (const conn of listener) {
    const lines = conn.readable
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream());
    for await (const line of lines) {
        await parse(line);
    }
}

async function parse(msg) {
    const req = JSON.parse(msg);
    
    let uri = req.request.uri;
    if (uri.includes("?")) {
        uri = req.request.uri.split("?").slice(0, -1)[0];
    }

    const entry = {
        ts: new Date(parseFloat(req.ts) * 1000).toISOString(),
        client_ip: req.request.client_ip,
        method: req.request.method,
        host: req.request.host,
        uri: uri,
        ua: req.request.headers["User-Agent"] ? req.request.headers["User-Agent"][0] : "",
        size: req.size,
        status: req.status,
        duration: req.duration
    };

    const outData = JSON.stringify(entry);
    if (writer) {
        await writer.write(encoder.encode(outData + "\n")).catch((err) => {
            console.log(err);
        });
    } else {
        console.log(outData);
    }
}
