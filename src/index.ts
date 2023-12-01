import * as vscode from 'vscode'

function generateHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PPM View</title>
</head>
<body>
  <h1>Hello PPM</h1>
</body>
</html>
`
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
  private readonly _webviews = new Set<{ readonly resource: string; readonly webviewPanel: vscode.WebviewPanel; }>()

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

  async resolveCustomEditor(document: PPMDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken) {
    webviewPanel.webview.options = { enableScripts: true, }
    webviewPanel.webview.html = generateHTML()
    this.webviews.add(document.uri, webviewPanel)
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new PPMProvider(context)
  const options = { supportsMultipleEditorsPerDocument: false, }
  const disposable = vscode.window.registerCustomEditorProvider('vscode-ppm-view.ppm-view', provider, options)
  context.subscriptions.push(disposable)
}

export function deactivate() { }
