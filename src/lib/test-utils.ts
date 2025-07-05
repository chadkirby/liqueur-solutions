/**
 * Reads a ReadableStream and returns the parsed JSON content
 */
export async function readResponseBody(stream: ReadableStream): Promise<any> {
  const reader = stream.getReader();
  const chunks = [];
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) chunks.push(value);
  }

  const bodyText = new TextDecoder().decode(
    new Uint8Array(chunks.flatMap((chunk) => Array.from(chunk)))
  );

  return JSON.parse(bodyText);
}
