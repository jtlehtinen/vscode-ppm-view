import * as vscode from 'vscode'

const createWebviewContent = (title: string, uris: { script: vscode.Uri }) => {
  const config = vscode.workspace.getConfiguration('editor')
  const fontFamily = config.get('fontFamily') ?? `Consolas, 'Courier New', monospace`

  const nonce = getNonce()

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
        flex-direction: column;
        font-family: ${fontFamily};
        background-color: var(--vscode-editor-background);
      }

      .error {
        font-size: 1rem;
        font-weight: bold;
        color: red;
      }

      p {
        color: var(--vscode-editor-foreground);
        font-size: 1rem;
      }
    </style>
  </head>
  <body>
    <p id="info" style="text-align: center;"></p>
    <p id="error" class="error"></p>
    <canvas id="canvas"></canvas>
    <script nonce="${nonce}" src="${uris.script}"></script>
  </body>
</html>
  `
}

const getNonce = () => {
  // @NOTE: No need for cryptographically secure random nonce
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export { createWebviewContent }
