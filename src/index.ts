import * as vscode from 'vscode'
import { parsePPM } from './ppm'
import { createWebviewContent } from './webview'
import type { Image } from './ppm'

async function readFile(uri: vscode.Uri): Promise<Uint8Array> {
  return vscode.workspace.fs.readFile(uri)
}

async function readPPMFromFile(uri: vscode.Uri): Promise<Image> {
  const ppm = await readFile(uri)
  return parsePPM(ppm)
}

class PPMDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri

  private constructor(uri: vscode.Uri) {
    this.uri = uri
  }

  dispose(): void {}

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

  constructor(private readonly _context: vscode.ExtensionContext) {}

  async openCustomDocument(uri: vscode.Uri, _openContext: {}, _token: vscode.CancellationToken): Promise<PPMDocument> {
    return await PPMDocument.create(uri)
  }

  async resolveCustomEditor(document: PPMDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {

    const options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'assets')],
    }

    const uris = {
      script: webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'assets', 'main.js')),
    }

    webviewPanel.webview.options = options
    webviewPanel.webview.html = createWebviewContent(document.uri.toString(), uris)
    this.webviews.add(document.uri, webviewPanel)

    this.reload(document.uri)
  }

  async reload(uri: vscode.Uri): Promise<void> {
    const views = Array.from(this.webviews.get(uri))
    if (views.length === 0) return

    try {
      const image = await readPPMFromFile(uri)

      views.forEach((view) => {
        view.webview.postMessage({
          command: 'image',
          width: image.width,
          height: image.height,
          pixels: image.pixels,
          format: image.format,
        })
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'

      views.forEach((view) => {
        view.webview.postMessage({
          command: 'error',
          message: message,
        })
      })
    }
  }
}

function activate(context: vscode.ExtensionContext) {
  const provider = new PPMProvider(context)
  const options = {
    supportsMultipleEditorsPerDocument: false,
    webviewOptions: {
      retainContextWhenHidden: true,
    }
  }
  const disposable = vscode.window.registerCustomEditorProvider(
    'vscode-ppm-view.ppm',
    provider,
    options,
  )
  context.subscriptions.push(disposable)

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.ppm')
  watcher.onDidChange((uri: vscode.Uri): void => {
    // @NOTE: File modified event may be triggered before the file
    // modification operation has finished. Add artificial delay to
    // hack around it.
    // @TODO: Find better solution.
    setTimeout(() => provider.reload(uri), 500)
  })
  context.subscriptions.push(watcher)
}

export { activate }
