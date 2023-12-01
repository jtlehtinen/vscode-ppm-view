import * as vscode from 'vscode'
import { parsePPM } from './ppm'

function generateHTML(uri: vscode.Uri, pixels: Uint8Array, width: number, height: number) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PPM</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html {
      height: 100%;
    }

    body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>

  <script>
    const width = ${width}
    const height = ${height}

    const canvas = document.getElementById('canvas')
    canvas.width = width
    canvas.height = height

    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
    const context = canvas.getContext('2d')
    const imageData = context.createImageData(width, height)

    // @TODO: This is just awful... How to embed binary data?
    // @TODO: Way to read from the file system?
    const pixels = [${pixels.join(',')}]
    const data = imageData.data
    pixels.forEach((px, idx) => data[idx] = px)

    context.putImageData(imageData, 0, 0)
  </script>
</body>
</html>
`
}

async function readTextFile(uri: vscode.Uri): Promise<string> {
  const document = await vscode.workspace.openTextDocument(uri)
  return document.getText()
}

async function readPPMAndGenerateHTML(uri: vscode.Uri): Promise<string> {
  try {
    const ppm = await readTextFile(uri)
    const image = parsePPM(ppm)
    return generateHTML(uri, image.pixels, image.width, image.height)
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message)
    return "ERROR: " + err.message
  }
}

class PPMDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri

  private constructor(uri: vscode.Uri) {
    this.uri = uri
  }

  dispose(): void { }

  static async create(uri: vscode.Uri): Promise<PPMDocument> {
    return new PPMDocument(uri)
  }
}

// WebviewCollection taken from
// https://github.com/microsoft/vscode-extension-samples/blob/main/custom-editor-sample/src/pawDrawEditor.ts
class WebviewCollection {
  private readonly _webviews = new Set<{ readonly resource: string; readonly webviewPanel: vscode.WebviewPanel }>()

  // Get all known webviews for a given uri.
  public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
    const key = uri.toString()
    for (const entry of this._webviews) {
      if (entry.resource === key) {
        yield entry.webviewPanel
      }
    }
  }

  // Add a new webview to the collection.
  public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
    const entry = { resource: uri.toString(), webviewPanel }
    this._webviews.add(entry)
    webviewPanel.onDidDispose(() => this._webviews.delete(entry))
  }
}

class PPMProvider implements vscode.CustomReadonlyEditorProvider<PPMDocument> {
  private readonly webviews = new WebviewCollection()

  constructor(private readonly _context: vscode.ExtensionContext) { }

  async openCustomDocument(uri: vscode.Uri, _openContext: {}, _token: vscode.CancellationToken): Promise<PPMDocument> {
    return await PPMDocument.create(uri)
  }

  async resolveCustomEditor(document: PPMDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true }
    webviewPanel.webview.html = await readPPMAndGenerateHTML(document.uri)
    this.webviews.add(document.uri, webviewPanel)
  }

  async refresh(uri: vscode.Uri): Promise<void> {
    const views = Array.from(this.webviews.get(uri))
    if (views.length === 0) return

    const html = await readPPMAndGenerateHTML(uri)
    views.forEach(view => view.webview.html = html)
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new PPMProvider(context)
  const options = { supportsMultipleEditorsPerDocument: false }
  const disposable = vscode.window.registerCustomEditorProvider('vscode-ppm-view.ppm-view', provider, options)
  context.subscriptions.push(disposable)

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.ppm')
  watcher.onDidChange(uri => provider.refresh(uri))
  context.subscriptions.push(watcher)
}

export function deactivate() { }
